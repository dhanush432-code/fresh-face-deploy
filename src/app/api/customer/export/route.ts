// /app/api/customer/export/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import * as XLSX from 'xlsx';

// Helper to format a date string or return 'N/A'
const formatDateForExport = (date?: string | Date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

export async function GET(req: Request) {
  // 1. Authentication and Authorization
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_READ)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // 2. Fetch ALL customers without pagination
    console.log("Starting export process: Fetching all customers...");
    const allCustomers = await Customer.find({ isActive: true }).sort({ createdAt: -1 }).lean();

    if (allCustomers.length === 0) {
      return NextResponse.json({ success: false, message: 'No customers to export' }, { status: 404 });
    }
    
    const allCustomerIds = allCustomers.map(c => c._id);
    
    // 3. Fetch all related data (appointments, loyalty) in parallel
    console.log(`Fetching related data for ${allCustomerIds.length} customers...`);
    const [allLatestAppointments, allLoyaltyPoints] = await Promise.all([
      Appointment.aggregate([
        { $match: { customerId: { $in: allCustomerIds } } },
        { $addFields: { unifiedDate: { $ifNull: ["$appointmentDateTime", "$date"] } } },
        { $sort: { unifiedDate: -1 } },
        { $lookup: { from: 'serviceitems', localField: 'serviceIds', foreignField: '_id', as: 'populatedServices' } },
        { $group: { _id: '$customerId', lastAppointmentDate: { $first: '$unifiedDate' }, lastServicesDetails: { $first: '$populatedServices' } } }
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { customerId: { $in: allCustomerIds } } },
        { $group: { _id: '$customerId', totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } } } }
      ])
    ]);

    const appointmentMap = new Map(allLatestAppointments.map(a => [a._id.toString(), a]));
    const loyaltyMap = new Map(allLoyaltyPoints.map(l => [l._id.toString(), l.totalPoints]));

    // 4. Format the data for the worksheet
    console.log("Formatting data for Excel worksheet...");
    const formattedData = allCustomers.map((customer: any) => {
      const appointmentDetails = appointmentMap.get(customer._id.toString());
      const loyaltyPoints = loyaltyMap.get(customer._id.toString()) || 0;

      return {
        'Name': customer.name,
        'Email': customer.email ?? 'N/A',
        'Phone Number': customer.decryptedPhoneNumber || customer.phoneNumber, // Use decrypted if available
        'Membership': customer.isMembership ? 'Yes' : 'No',
        'Loyalty Points': loyaltyPoints,
        'Date of Birth': formatDateForExport(customer.dob),
        'Gender': customer.gender ?? 'N/A',
        'Last Visit Date': formatDateForExport(appointmentDetails?.lastAppointmentDate),
        'Last Services': appointmentDetails?.lastServicesDetails?.map((s: any) => s.name).join(', ') || 'N/A',
        'Joined On': formatDateForExport(customer.createdAt),
      };
    });

    // 5. Create the Excel file in memory
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    
    // Optional: Set column widths
    worksheet['!cols'] = [ { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 18 }];

    // 6. Generate the file buffer
    console.log("Generating XLSX buffer...");
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // 7. Return the file as a response
    console.log("Sending file to client.");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="All_Customers_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error: any) {
    console.error("API Error during export:", error);
    return NextResponse.json({ success: false, message: "Failed to export customers" }, { status: 500 });
  }
}