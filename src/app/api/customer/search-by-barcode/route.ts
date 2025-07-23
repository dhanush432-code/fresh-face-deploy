// app/api/customer/search-by-barcode/route.ts - FINAL & CORRECT
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import ServiceItem from '@/models/ServiceItem';
import Stylist from '@/models/Stylist';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get('barcode');
    
    if (!barcode) {
      return NextResponse.json({
        success: false,
        message: 'Barcode is required'
      }, { status: 400 });
    }
    
    // Find customer by barcode
    const customer = await Customer.findOne({ membershipBarcode: barcode, isActive: true });
    
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'No active customer found with this barcode'
      }, { status: 404 });
    }
    
    // This logic is now identical to the detailed fetch in the other search route
    const [appointmentHistory, loyaltyData] = await Promise.all([
      Appointment.find({ customerId: customer._id })
        .sort({ appointmentDateTime: -1 }) // CORRECT FIELD
        .limit(20)
        .populate({ path: 'stylistId', model: Stylist, select: 'name' })
        .populate({ path: 'serviceIds', model: ServiceItem, select: 'name' })
        .lean(),
      LoyaltyTransaction.aggregate([
        { $match: { customerId: customer._id } },
        { $group: { _id: null, totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } } } }
      ])
    ]);

    const calculatedLoyaltyPoints = loyaltyData.length > 0 ? loyaltyData[0].totalPoints : 0;
    
    const totalSpent = appointmentHistory
      .filter(apt => (apt as any).status === 'Paid')
      .reduce((sum, apt) => sum + ((apt as any).finalAmount || (apt as any).amount || 0), 0);

    const customerDetails = {
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      isMember: customer.isMembership || false,
      membershipDetails: customer.isMembership ? { planName: 'Member', status: 'Active' } : null,
      membershipBarcode: customer.membershipBarcode,
      gender: customer.gender || 'other',
      loyaltyPoints: calculatedLoyaltyPoints,
      lastVisit: appointmentHistory.length > 0 ? (appointmentHistory[0] as any).appointmentDateTime : null, // CORRECT FIELD
      totalSpent: totalSpent,
      appointmentHistory: appointmentHistory.map(apt => ({
        _id: (apt as any)._id.toString(),
        date: (apt as any).appointmentDateTime, // CORRECT FIELD
        services: ((apt as any).serviceIds || []).map((s: any) => s.name),
        totalAmount: (apt as any).finalAmount || (apt as any).amount || 0,
        stylistName: (apt as any).stylistId?.name || 'N/A',
        status: (apt as any).status || 'Unknown'
      }))
    };
    
    return NextResponse.json({
      success: true,
      customer: customerDetails
    });
    
  } catch (error) {
    console.error('Error searching customer by barcode:', error);
    return NextResponse.json({
      success: false,
      message: 'An internal server error occurred.'
    }, { status: 500 });
  }
}
