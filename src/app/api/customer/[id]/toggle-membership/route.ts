// /app/api/customer/[id]/toggle-membership/route.ts - FINAL CORRECTED VERSION

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import Stylist from '@/models/Stylist';
import ServiceItem from '@/models/ServiceItem';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_UPDATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    
    const { isMembership, membershipBarcode } = await req.json();
    const customerId = params.id;
    
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json({ success: false, message: 'Invalid Customer ID' }, { status: 400 });
    }
    
    if (isMembership === true && (!membershipBarcode || membershipBarcode.trim() === '')) {
      return NextResponse.json({ success: false, message: 'Membership barcode is required to grant membership.' }, { status: 400 });
    }

    if (isMembership === true) {
      const existingCustomer = await Customer.findOne({ membershipBarcode: membershipBarcode.trim() });
      if (existingCustomer && existingCustomer._id.toString() !== customerId) {
        return NextResponse.json({ success: false, message: 'This barcode is already assigned to another customer.' }, { status: 409 });
      }
    }

    // --- THIS IS THE EXPLICIT FIX ---
    
    // 1. Prepare the data for the update operation.
    const updateData: any = { isMembership: isMembership };
    if (isMembership) {
      updateData.membershipBarcode = membershipBarcode.trim();
      updateData.membershipPurchaseDate = new Date();
    } else {
      // If removing membership, use $unset to completely remove the fields.
      updateData.$unset = { membershipBarcode: 1, membershipPurchaseDate: 1 };
    }
    
    // 2. Perform a direct update using findByIdAndUpdate.
    // The { new: true } option ensures it returns the document *after* the update.
    const updatedCustomer = await Customer.findByIdAndUpdate(customerId, updateData, { new: true }).lean();
    
    // --- END OF FIX ---

    if (!updatedCustomer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }
    
    // --- Re-fetch full details to send back a complete object for UI refresh ---
    const [allRecentAppointments, loyaltyData] = await Promise.all([
      Appointment.find({ customerId: updatedCustomer._id }).sort({ appointmentDateTime: -1, date: -1 }).limit(20).lean(),
      LoyaltyTransaction.aggregate([
        { $match: { customerId: updatedCustomer._id } },
        { $group: { _id: null, totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } } } }
      ])
    ]);

    let activityStatus: 'Active' | 'Inactive' | 'New' = 'New';
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    if (allRecentAppointments.length > 0) {
      const lastAppointmentDate = allRecentAppointments[0].appointmentDateTime || allRecentAppointments[0].date;
      if (lastAppointmentDate) {
        activityStatus = new Date(lastAppointmentDate) >= twoMonthsAgo ? 'Active' : 'Inactive';
      }
    } else if (updatedCustomer.createdAt) {
      activityStatus = new Date(updatedCustomer.createdAt) < twoMonthsAgo ? 'Inactive' : 'New';
    }
    const calculatedLoyaltyPoints = loyaltyData.length > 0 ? loyaltyData[0].totalPoints : 0;
    
    const paidAppointmentIds = allRecentAppointments.filter(apt => apt.status === 'Paid').slice(0, 10).map(apt => apt._id);
    const populatedHistory = await Appointment.find({ _id: { $in: paidAppointmentIds } })
      .sort({ appointmentDateTime: -1, date: -1 })
      .populate({ path: 'stylistId', model: Stylist, select: 'name' })
      .populate({ path: 'serviceIds', model: ServiceItem, select: 'name price' })
      .lean();
    
    const finalCustomerObject = {
        ...updatedCustomer,
        id: updatedCustomer._id.toString(),
        currentMembership: updatedCustomer.isMembership,
        status: activityStatus,
        loyaltyPoints: calculatedLoyaltyPoints,
        appointmentHistory: populatedHistory.map(apt => {
          let finalDateTime;
          if (apt.appointmentDateTime) { finalDateTime = apt.appointmentDateTime; } 
          else if (apt.date && apt.time) {
            const dateStr = apt.date instanceof Date ? apt.date.toISOString().split('T')[0] : apt.date.toString();
            finalDateTime = new Date(`${dateStr}T${apt.time}:00.000Z`);
          } else { finalDateTime = apt.createdAt || new Date(); }
          return {
            _id: (apt as any)._id.toString(), id: (apt as any)._id.toString(), date: finalDateTime.toISOString(), totalAmount: (apt as any).finalAmount || (apt as any).amount || 0,
            stylistName: (apt as any).stylistId?.name || 'N/A', services: Array.isArray((apt as any).serviceIds) ? (apt as any).serviceIds.map((s: any) => s.name) : [],
            status: (apt as any).status || 'N/A',
          };
        }),
    };
    
    return NextResponse.json({
      success: true,
      message: `Membership status updated successfully.`,
      customer: finalCustomerObject 
    });
    
  } catch (error: any) {
    console.error('Error toggling membership:', error);
    const errorMessage = error.message || 'Failed to update membership status';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}