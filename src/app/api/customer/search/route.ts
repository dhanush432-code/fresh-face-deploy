// /app/api/customer/search/route.ts - FINAL CORRECTED VERSION

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/Appointment';
import ServiceItem from '@/models/ServiceItem';
import Stylist from '@/models/Stylist';
import LoyaltyTransaction from '@/models/loyaltyTransaction';

// --- IMPORT THE CORRECT FUNCTIONS ---
import { createSearchHash } from '@/lib/crypto'; // This might still be needed if you use it elsewhere.
import { createBlindIndex } from '@/lib/search-indexing'; // This is the one we must use for lookups.

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const fetchDetails = searchParams.get('details') === 'true';

    if (!query) {
      return NextResponse.json({ success: false, message: 'A search query is required.' }, { status: 400 });
    }
    
    // --- FETCH FULL DETAILS FOR SIDE PANEL (CORRECTED) ---
    if (fetchDetails) {
      const normalizedPhone = String(query).replace(/\D/g, '');
      
      // THIS IS THE FIX: Use the same hashing function that you use when creating the customer.
      const phoneHash = createBlindIndex(normalizedPhone); 
      
      const customer = await Customer.findOne({ phoneHash }); 

      if (!customer) {
        return NextResponse.json({ success: true, customer: null });
      }
      
      const [appointmentHistory, loyaltyData] = await Promise.all([
        Appointment.find({ customerId: customer._id }).sort({ appointmentDateTime: -1 }).limit(20)
            .populate({ path: 'stylistId', model: Stylist, select: 'name' })
            .populate({ path: 'serviceIds', model: ServiceItem, select: 'name' }).lean(),
        LoyaltyTransaction.aggregate([
          { $match: { customerId: customer._id } },
          { $group: { _id: null, totalPoints: { $sum: { $cond: [{ $eq: ['$type', 'Credit'] }, '$points', { $multiply: ['$points', -1] }] } } } }
        ])
      ]);
      const calculatedLoyaltyPoints = loyaltyData.length > 0 ? loyaltyData[0].totalPoints : 0;
      const customerDetails = {
        _id: customer._id.toString(), name: customer.name, email: customer.email, phoneNumber: customer.phoneNumber,
        isMember: customer.isMembership || false,
        membershipDetails: customer.isMembership ? { planName: 'Member', status: 'Active' } : null,
        gender: customer.gender || 'other', loyaltyPoints: calculatedLoyaltyPoints,
        lastVisit: appointmentHistory.length > 0 ? (appointmentHistory[0] as any).appointmentDateTime : null,
        appointmentHistory: appointmentHistory.map(apt => ({
          _id: (apt as any)._id.toString(), date: (apt as any).appointmentDateTime,
          services: ((apt as any).serviceIds || []).map((s: any) => s.name),
          totalAmount: (apt as any).finalAmount || (apt as any).amount || 0,
          stylistName: (apt as any).stylistId?.name || 'N/A',
          status: (apt as any).status || 'Unknown'
        }))
      };
      return NextResponse.json({ success: true, customer: customerDetails });
    }
    // --- GENERAL SEARCH FOR DROPDOWN (This part is already correct) ---
    else {
      if (query.trim().length < 2) {
        return NextResponse.json({ success: true, customers: [] });
      }

      const searchStr = query.trim();
      let findConditions: any = { isActive: true };
      const isNumeric = /^\d+$/.test(searchStr);

      if (isNumeric) {
        const searchHash = createBlindIndex(searchStr);
        findConditions.phoneSearchIndex = searchHash;
      } else {
        findConditions.searchableName = { $regex: searchStr, $options: 'i' };
      }
      
      const customers = await Customer.find(findConditions)
        .select('name phoneNumber email isMembership gender')
        .limit(10);
      
      return NextResponse.json({ success: true, customers });
    }
  } catch (error: any) {
    console.error("API Error searching customers:", error);
    return NextResponse.json({ success: false, message: "An internal server error occurred." }, { status: 500 });
  }
}