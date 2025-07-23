// src/app/api/advance-payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { formatISO } from 'date-fns';
import mongoose, { Types } from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import AdvancePayment from '../../../models/advance';
import Staff from '../../../models/staff'; // Assuming your staff model is here

// --- Type Definitions (for clarity and safety) ---
interface PopulatedStaffDetails {
  _id: Types.ObjectId;
  name: string;
  image?: string;
  position?: string;
}

interface LeanAdvancePaymentDocument {
  _id: Types.ObjectId;
  // FIX: staffId can now be null after a failed populate
  staffId: PopulatedStaffDetails | null; 
  requestDate: Date;
  amount: number;
  reason: string;
  repaymentPlan: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NewAdvancePaymentAPIPayload {
  staffId: string;
  amount: number;
  reason: string;
  repaymentPlan: string;
}

// --- Helper Function ---
// FIX: This function now safely handles cases where payment.staffId is null.
const formatPaymentResponse = (payment: LeanAdvancePaymentDocument) => ({
  id: payment._id.toString(),
  staffId: payment.staffId ? { // Check if staffId exists
    id: payment.staffId._id.toString(),
    name: payment.staffId.name,
    image: payment.staffId.image,
    position: payment.staffId.position,
  } : null, // If not, return null
  requestDate: formatISO(payment.requestDate),
  amount: payment.amount,
  reason: payment.reason,
  repaymentPlan: payment.repaymentPlan,
  status: payment.status,
  approvedDate: payment.approvedDate ? formatISO(payment.approvedDate) : null,
  createdAt: formatISO(payment.createdAt),
  updatedAt: formatISO(payment.updatedAt),
});

// --- Route Handlers ---

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const query: mongoose.FilterQuery<any> = {};

    const payments = await AdvancePayment.find(query)
      .populate< { staffId: PopulatedStaffDetails } >({
        path: 'staffId',
        select: 'name image position',
        model: Staff,
      })
      .sort({ requestDate: -1 })
      .lean<LeanAdvancePaymentDocument[]>();

    // FIX: Filter out any payments where the staff member was deleted/not found
    const validPayments = payments.filter(payment => payment.staffId);

    const formattedPayments = validPayments.map(formatPaymentResponse);
    return NextResponse.json({ success: true, data: formattedPayments });
  } catch (error: any) {
    console.error('API GET /api/advance-payments Error:', error);
    return NextResponse.json({ success: false, error: 'Server error fetching advance payments.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = (await request.json()) as NewAdvancePaymentAPIPayload;

    // Robust Validation
    if (!body.staffId || !mongoose.Types.ObjectId.isValid(body.staffId)) {
      return NextResponse.json({ success: false, error: 'Valid Staff ID is required.' }, { status: 400 });
    }
    if (body.amount == null || typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number.' }, { status: 400 });
    }
    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim() === '') {
      return NextResponse.json({ success: false, error: 'Reason is required.' }, { status: 400 });
    }
    if (!body.repaymentPlan || typeof body.repaymentPlan !== 'string' || body.repaymentPlan.trim() === '') {
      return NextResponse.json({ success: false, error: 'Repayment plan is required.' }, { status: 400 });
    }
    
    const staffExists = await Staff.findById(body.staffId);
    if (!staffExists) {
        return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    const newPayment = await AdvancePayment.create({
      staffId: body.staffId,
      amount: body.amount,
      reason: body.reason,
      repaymentPlan: body.repaymentPlan,
      status: 'pending',
      requestDate: new Date(),
    });
    
    // Re-fetch and populate to return the full object to the client
    const populatedPayment = await AdvancePayment.findById(newPayment._id)
        .populate<{ staffId: PopulatedStaffDetails }>({ path: 'staffId', select: 'name image position', model: Staff })
        .lean<LeanAdvancePaymentDocument>();
        
    if (!populatedPayment) {
      // This case is unlikely but good to have
      return NextResponse.json({ success: false, error: 'Could not retrieve created record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: formatPaymentResponse(populatedPayment) }, { status: 201 });

  } catch (error: any) {
    console.error('API POST /api/advance-payments Error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Server error creating advance payment.' }, { status: 500 });
  }
}