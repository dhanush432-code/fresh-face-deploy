// app/api/membership-plans/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import MembershipPlan from '@/models/membershipPlan'; // Adjust path if your models are elsewhere

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const plans = await MembershipPlan.find({ isActive: true }).sort({ price: 1 }); // Sort by price ascending

    return NextResponse.json({ success: true, plans: plans.map(plan => ({
        ...plan.toObject(), // Convert Mongoose doc to plain object
        id: plan._id.toString(), // Ensure 'id' field
        _id: plan._id.toString()  // Ensure '_id' is also string for consistency if needed
    })) });
  } catch (error: any) {
    console.error("API Error fetching membership plans:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch membership plans." }, { status: 500 });
  }
}