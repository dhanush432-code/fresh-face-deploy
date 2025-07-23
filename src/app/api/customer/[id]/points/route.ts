// app/api/customer/[id]/points/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import mongoose from 'mongoose';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: customerId } = params;
    const { points, reason } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json({ success: false, message: 'Invalid Customer ID' }, { status: 400 });
    }
    if (typeof points !== 'number' || points === 0) {
      return NextResponse.json({ success: false, message: 'Points must be a non-zero number' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json({ success: false, message: 'A valid reason is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // 1. Find the customer to check their current points
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // 2. Prevent the balance from going negative
    if (customer.loyaltyPoints + points < 0) {
      throw new Error(`Operation failed. Customer only has ${customer.loyaltyPoints} points.`);
    }

    // 3. Update the customer's point balance
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $inc: { loyaltyPoints: points } }, // $inc safely increments/decrements
      { new: true, session } // 'new: true' returns the updated doc
    );

    if (!updatedCustomer) throw new Error('Failed to update customer points.');
    
    // 4. Create a log of the transaction
    await LoyaltyTransaction.create([{
      customerId,
      points: Math.abs(points), // Store points as a positive number in the log
      type: points > 0 ? 'Credit' : 'Debit',
      reason: `Manual Adjustment: ${reason.trim()}`,
    }], { session });

    await session.commitTransaction(); // Commit all changes if everything was successful

    return NextResponse.json({
      success: true,
      message: 'Loyalty points updated successfully',
      customer: {
        loyaltyPoints: updatedCustomer.loyaltyPoints,
      }
    });

  } catch (err: any) {
    await session.abortTransaction(); // Rollback all changes on any error
    console.error('API Error in /api/customer/[id]/points:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to update points' }, { status: 500 });
  } finally {
    session.endSession(); // Always end the session
  }
}