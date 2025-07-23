// /app/api/customer/[id]/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import ServiceItem from '@/models/ServiceItem';
import Stylist from '@/models/Stylist';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// --- (1) IMPORT THE NECESSARY FUNCTIONS FOR ENCRYPTION AND INDEXING ---
import { encrypt } from '@/lib/crypto';
import { createBlindIndex, generateNgrams } from '@/lib/search-indexing';

// This interface should reflect the actual fields your lean() query returns
interface LeanCustomer {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  name: string;
  email?: string;
  phoneNumber: string;
  gender?: string;
  isActive: boolean;
  isMembership: boolean;
  membershipBarcode?: string;
}

// ===================================================================================
//  GET: Handler for fetching full customer details (This function is correct)
// ===================================================================================
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const customerId = params.id;

  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_READ)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Invalid Customer ID.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    
    // Your logic for fetching and composing the detailed customer object is correct.
    // No changes are needed here.
    const customer = await Customer.findById(customerId).lean<LeanCustomer>();
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }

    const [allRecentAppointments, loyaltyData] = await Promise.all([
      Appointment.find({ customerId: customer._id }).sort({ appointmentDateTime: -1, date: -1 }).limit(20).lean(),
      LoyaltyTransaction.aggregate([
        { $match: { customerId: customer._id } },
        { $group: { _id: null, totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } } } }
      ])
    ]);

    let activityStatus: 'Active' | 'Inactive' | 'New' = 'New';
    let lastVisit: string | null = null;
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    if (allRecentAppointments.length > 0) {
      const lastAppointmentDate = allRecentAppointments[0].appointmentDateTime || allRecentAppointments[0].date;
      if (lastAppointmentDate) {
        activityStatus = new Date(lastAppointmentDate) >= twoMonthsAgo ? 'Active' : 'Inactive';
        lastVisit = new Date(lastAppointmentDate).toISOString();
      }
    } else if (customer.createdAt) {
      activityStatus = new Date(customer.createdAt) < twoMonthsAgo ? 'Inactive' : 'New';
    }

    const calculatedLoyaltyPoints = loyaltyData.length > 0 ? loyaltyData[0].totalPoints : 0;

    const paidAppointmentIds = allRecentAppointments.filter(apt => apt.status === 'Paid').map(apt => apt._id);
    const populatedHistory = await Appointment.find({ _id: { $in: paidAppointmentIds } })
      .sort({ appointmentDateTime: -1, date: -1 })
      .populate({ path: 'stylistId', model: Stylist, select: 'name' })
      .populate({ path: 'serviceIds', model: ServiceItem, select: 'name price' })
      .lean();

    const customerDetails = {
      id: customer._id.toString(),
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      gender: customer.gender,
      isMember: customer.isMembership,
      membershipBarcode: customer.membershipBarcode,
      membershipDetails: customer.isMembership ? { planName: 'Member', status: 'Active' } : null,
      status: activityStatus,
      lastVisit: lastVisit,
      loyaltyPoints: calculatedLoyaltyPoints,
      currentMembership: customer.isMembership,
      createdAt: customer.createdAt || customer._id.getTimestamp(),
      appointmentHistory: populatedHistory.map(apt => {
        let finalDateTime;
        if (apt.appointmentDateTime && apt.appointmentDateTime instanceof Date) {
          finalDateTime = apt.appointmentDateTime;
        } else if (apt.date && apt.time) {
          const dateStr = apt.date instanceof Date ? apt.date.toISOString().split('T')[0] : apt.date.toString();
          finalDateTime = new Date(`${dateStr}T${apt.time}:00.000Z`);
        } else {
          finalDateTime = apt.createdAt || new Date();
        }
        return {
          _id: (apt as any)._id.toString(),
          id: (apt as any)._id.toString(),
          date: finalDateTime.toISOString(),
          totalAmount: (apt as any).finalAmount || (apt as any).amount || 0,
          stylistName: (apt as any).stylistId?.name || 'N/A',
          services: Array.isArray((apt as any).serviceIds) ? (apt as any).serviceIds.map((s: any) => s.name) : [],
          status: (apt as any).status || 'N/A',
        };
      })
    };

    return NextResponse.json({ success: true, customer: customerDetails });

  } catch (error: any) {
    console.error(`API Error fetching details for customer ${params.id}:`, error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}

// ===================================================================================
//  PUT: Handler for UPDATING a customer (CORRECTED AND FINAL VERSION)
// ===================================================================================
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const customerId = params.id;
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Invalid Customer ID.' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_UPDATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    // The object that will contain all fields to be updated.
    const updateData: any = {};

    // --- (2) HANDLE PHONE NUMBER UPDATE ---
    // If a new phone number is provided, we must regenerate ALL associated fields.
    if (body.phoneNumber) {
      const normalizedPhoneNumber = String(body.phoneNumber).replace(/\D/g, '');
      
      updateData.phoneNumber = encrypt(normalizedPhoneNumber);
      updateData.phoneHash = createBlindIndex(normalizedPhoneNumber);
      updateData.last4PhoneNumber = normalizedPhoneNumber.slice(-4);
      updateData.phoneSearchIndex = generateNgrams(normalizedPhoneNumber).map(ngram => createBlindIndex(ngram));
    }

    // --- (3) HANDLE NAME UPDATE ---
    // If the name is updated, we also need to update the encrypted name and the searchableName.
    if (body.name) {
      updateData.name = encrypt(body.name);
      updateData.searchableName = body.name.toLowerCase().trim();
    }
    
    // --- (4) HANDLE EMAIL UPDATE ---
    // This logic allows setting the email to a new value or clearing it by sending null/empty string.
    if (typeof body.email !== 'undefined') {
      updateData.email = body.email ? encrypt(body.email) : undefined;
    }

    // --- (5) HANDLE OTHER SIMPLE FIELDS ---
    if (body.dob) updateData.dob = body.dob;
    if (body.gender) updateData.gender = body.gender;
    // Add any other fields from your model that can be updated here...

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'No update data provided.' }, { status: 400 });
    }

    // --- (6) PERFORM THE ATOMIC UPDATE ---
    // Use findByIdAndUpdate with $set to apply all changes at once.
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: updateData },
      { new: true, runValidators: true } // `new: true` returns the updated document.
    );

    if (!updatedCustomer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }
    
    // The 'post' hook on your model will correctly decrypt the fields for the JSON response.
    return NextResponse.json({ success: true, customer: updatedCustomer });

  } catch (error: any) {
    console.error(`API Error updating customer ${customerId}:`, error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({ success: false, message: `A customer with this ${field} already exists.` }, { status: 409 });
    }
    if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, message: `Validation Error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update customer.' }, { status: 500 });
  }
}

// ===================================================================================
//  DELETE: Handler for "soft deleting" a customer (This function is correct)
// ===================================================================================
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const customerId = params.id;
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return NextResponse.json({ success: false, message: 'Invalid Customer ID.' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_DELETE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    // Your logic for deactivating a customer is correct.
    const deactivatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { isActive: false },
      { new: true }
    );

    if (!deactivatedCustomer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Customer has been deactivated successfully.' });

  } catch (error: any) {
    console.error(`API Error deactivating customer ${customerId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to deactivate customer.' }, { status: 500 });
  }
}