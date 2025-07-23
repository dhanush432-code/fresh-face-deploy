// /api/customer/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import mongoose from 'mongoose';

// --- (1) IMPORT THE NEW SEARCH & ENCRYPTION FUNCTIONS ---
// Import the new functions for creating the secure search indexes.
import { createBlindIndex, generateNgrams } from '@/lib/search-indexing';
// Import the encryption function for creating new customers.
import { encrypt } from '@/lib/crypto';

// ===================================================================================
//  GET: Handler for searching and listing customers (UPDATED)
// ===================================================================================
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      await connectToDatabase();
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const searchQuery = searchParams.get('search')?.trim(); // Trim whitespace from search query
      const skip = (page - 1) * limit;
  
      let query: any = { isActive: true };
  
      // --- (2) ENHANCED SEARCH LOGIC ---
      // This block now intelligently handles searches for both phone numbers and names.
      if (searchQuery) {
        // Test if the search query consists only of digits.
        const isNumeric = /^\d+$/.test(searchQuery);

        if (isNumeric) {
          // --- If it's a number, perform a partial, secure search on the phone number ---
          // This creates the same hash from the user's input that we store in the index.
          const searchHash = createBlindIndex(searchQuery);
          // This query is extremely fast because `phoneSearchIndex` is indexed in your schema.
          query.phoneSearchIndex = searchHash;
        } else {
          // --- If it contains letters, perform a partial, case-insensitive search on the name ---
          query.searchableName = { $regex: searchQuery, $options: 'i' };
        }
      }
      // If there's no searchQuery, the `query` object remains `{ isActive: true }`,
      // which will correctly list all active customers.
  
      // --- The rest of your data aggregation logic remains unchanged ---
      const [customersFromDb, totalCustomers] = await Promise.all([
        Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Customer.countDocuments(query)
      ]);
      
      const customerIds = customersFromDb.map(c => c._id);
  
      const [latestAppointments, loyaltyPointsData] = await Promise.all([
        Appointment.aggregate([
          { $match: { customerId: { $in: customerIds } } },
          { $addFields: { unifiedDate: { $ifNull: ["$appointmentDateTime", "$date"] } } },
          { $sort: { unifiedDate: -1 } },
          {
            $lookup: {
              from: 'serviceitems',
              localField: 'serviceIds',
              foreignField: '_id',
              as: 'populatedServices'
            }
          },
          { 
            $group: { 
              _id: '$customerId', 
              lastAppointmentDate: { $first: '$unifiedDate' },
              lastServicesDetails: { $first: '$populatedServices' }
            } 
          }
        ]),
        LoyaltyTransaction.aggregate([
          { $match: { customerId: { $in: customerIds } } },
          { 
            $group: { 
              _id: '$customerId', 
              totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } }
            }
          }
        ])
      ]);
  
      const appointmentMap = new Map(latestAppointments.map((a: any) => [a._id.toString(), a]));
      const loyaltyMap = new Map(loyaltyPointsData.map((l: any) => [l._id.toString(), l.totalPoints]));
      
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
      const customersWithDetails = customersFromDb.map((customer: any) => {
        const latestAppointmentDetails = appointmentMap.get(customer._id.toString());
        const loyaltyPoints = loyaltyMap.get(customer._id.toString()) || 0;
        let status: 'Active' | 'Inactive' | 'New';
  
        if (latestAppointmentDetails) {
          status = new Date(latestAppointmentDetails.lastAppointmentDate) >= twoMonthsAgo ? 'Active' : 'Inactive';
        } else {
          status = (customer.createdAt && new Date(customer.createdAt) < twoMonthsAgo) ? 'Inactive' : 'New';
        }
        
        const finalCustomerObject = {
          ...customer,
          id: customer._id.toString(),
          status: status,
          loyaltyPoints: loyaltyPoints,
          appointmentHistory: latestAppointmentDetails ? [{
              date: latestAppointmentDetails.lastAppointmentDate,
              services: latestAppointmentDetails.lastServicesDetails?.map((s: any) => s.name) || [],
              _id: '', id: '', status: '', totalAmount: 0, stylistName: ''
          }] : [],
        };
        
        return finalCustomerObject;
      });
  
      const totalPages = Math.ceil(totalCustomers / limit);
  
      return NextResponse.json({
        success: true,
        customers: customersWithDetails,
        pagination: { totalCustomers, totalPages, currentPage: page, limit }
      });
  
    } catch (error: any) {
      console.error("API Error fetching customers:", error);
      return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
    }
}


// ===================================================================================
//  POST: Handler for creating a customer (UPDATED)
// ===================================================================================
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_CREATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connectToDatabase();
    const body = await req.json();
    
    if (!body.name || !body.phoneNumber) {
        return NextResponse.json({ success: false, message: 'Name and Phone Number are required.' }, { status: 400 });
    }

    // --- (3) PREPARE ALL DATA, INCLUDING THE NEW SEARCH INDEX ---
    const normalizedPhoneNumber = String(body.phoneNumber).replace(/\D/g, '');
    
    // Create the hash for exact-match duplicate checks (this is still useful).
    const phoneHash = createBlindIndex(normalizedPhoneNumber);

    // --- Generate the array of searchable hashes for partial search ---
    const phoneSearchIndexes = generateNgrams(normalizedPhoneNumber).map(ngram => createBlindIndex(ngram));

    // --- Check for Duplicates using the exact-match hash ---
    const existingCustomer = await Customer.findOne({ phoneHash });
    if (existingCustomer) {
        return NextResponse.json({ 
            success: false, 
            message: 'A customer with this phone number already exists.', 
            exists: true, 
            customer: existingCustomer
        }, { status: 409 });
    }

    // --- (4) CREATE CUSTOMER DOCUMENT WITH THE NEW `phoneSearchIndex` FIELD ---
    const newCustomerData = {
      // Encrypt sensitive fields
      name: encrypt(body.name),
      phoneNumber: encrypt(normalizedPhoneNumber),
      email: body.email ? encrypt(body.email) : undefined,

      // Add the required search and index fields
      phoneHash, // For exact matches
      searchableName: body.name.toLowerCase(),
      last4PhoneNumber: normalizedPhoneNumber.slice(-4),
      phoneSearchIndex: phoneSearchIndexes, // <-- THE NEWLY GENERATED INDEXES ARE ADDED HERE
      
      // Add other optional fields from the form
      dob: body.dob || undefined,
      gender: body.gender || undefined,
      survey: body.survey || undefined,
    };

    const newCustomer = await Customer.create(newCustomerData);

    // The 'post' middleware on your model will decrypt fields before sending the response.
    return NextResponse.json({ success: true, data: newCustomer }, { status: 201 });

  } catch (error: any) {
    console.error("API Error creating customer:", error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, message: `Validation Error: ${error.message}` }, { status: 400 });
    }
    // Handle specific duplicate key errors (e.g., for email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({ success: false, message: `A customer with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: "Failed to create customer" }, { status: 500 });
  }
}