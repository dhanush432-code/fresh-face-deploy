// app/api/customer-memberships/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CustomerMembership from '@/models/customerMembership';
import MembershipPlan from '@/models/membershipPlan';
import Customer from '@/models/customermodel'; // To verify customer exists
import mongoose from 'mongoose';

interface RequestBody {
  customerId: string;
  membershipPlanId: string;
  // Potentially other fields like payment details if this flow involves immediate separate payment
  // For now, assumes price is from plan and payment is handled at POS or implicitly
}

export async function POST(req: Request) {
  const session = await mongoose.startSession(); // Use transactions for atomicity
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await req.json() as RequestBody;
    const { customerId, membershipPlanId } = body;

    if (!customerId || !membershipPlanId) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: "Customer ID and Membership Plan ID are required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(membershipPlanId)) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ success: false, message: "Invalid Customer ID or Membership Plan ID format." }, { status: 400 });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });
    }

    // Verify membership plan exists and is active
    const plan = await MembershipPlan.findById(membershipPlanId).session(session);
    if (!plan) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: "Membership plan not found." }, { status: 404 });
    }
    if (!plan.isActive) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ success: false, message: "This membership plan is currently not active and cannot be assigned." }, { status: 400 });
    }

    // Optional: Check for existing active membership for this customer.
    // Decide on your business rule:
    // - Allow multiple active memberships?
    // - Allow only one active membership at a time?
    // - Allow upgrading/changing an existing one?
    // For this example, let's prevent adding a new one if one is already 'Active'.
    const existingActiveMembership = await CustomerMembership.findOne({
        customerId: customer._id,
        status: 'Active',
        endDate: { $gte: new Date() } // Check if not expired
    }).session(session);

    if (existingActiveMembership) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({
            success: false,
            message: `${customer.name} already has an active membership (Plan: ${existingActiveMembership.membershipPlanId.toString()}). Manage the existing membership first.`
        }, { status: 409 }); // 409 Conflict
    }

    // Calculate start and end dates for the new membership
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // Create the new CustomerMembership document
    const newCustomerMembership = new CustomerMembership({
      customerId: customer._id,
      membershipPlanId: plan._id,
      startDate,
      endDate,
      status: 'Active', // New memberships are typically active immediately
      pricePaid: plan.price, // Price paid is the plan's current price
      // originalInvoiceId: can be left undefined if not part of a larger bill in this flow
    });

    await newCustomerMembership.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Prepare the response, potentially populating plan details for confirmation
    const populatedMembership = await CustomerMembership.findById(newCustomerMembership._id)
                                    .populate({ path: 'membershipPlanId', select: 'name price durationDays benefits' })
                                    .populate({ path: 'customerId', select: 'name email' });


    return NextResponse.json({
      success: true,
      message: "Membership added successfully to customer.",
      membership: populatedMembership // Send back the created membership details
    }, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction(); // Ensure transaction is aborted on any error
    session.endSession();
    console.error("Error in POST /api/customer-memberships:", error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return NextResponse.json({ success: false, message: "Validation failed.", errors: messages }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || "Failed to add membership." }, { status: 500 });
  }
}

// You might also want a GET endpoint here later to fetch all memberships for a customer
// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const customerId = searchParams.get('customerId');
//   if (!customerId) { /* ... handle error ... */ }
//   const memberships = await CustomerMembership.find({ customerId }).populate('membershipPlanId');
//   return NextResponse.json({ success: true, memberships });
// }