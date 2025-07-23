// app/api/customer/[id]/membership-discounts/route.ts - GET MEMBERSHIP DISCOUNTS
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const { serviceIds } = await req.json();

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });
    }

    const discounts = await customer.getMembershipDiscount(serviceIds);
    const hasMembership = await customer.hasActiveMembership();

    return NextResponse.json({ 
      success: true, 
      discounts,
      membership: hasMembership ? customer.currentMembershipId : null
    });

  } catch (error: any) {
    console.error("API Error fetching membership discounts:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}