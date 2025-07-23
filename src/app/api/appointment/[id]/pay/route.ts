// app/api/appointments/[id]/pay/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Stylist from '@/models/Stylist';
import Customer from '@/models/customermodel';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import mongoose from 'mongoose';

// Note: We are removing the POINTS_PER_DOLLAR rule as it's no longer needed.

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const appointmentId = params.id;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return NextResponse.json({ success: false, message: 'Invalid Appointment ID.' }, { status: 400 });
  }
  
  // We need the bill details from the frontend to know how many services there were.
  // The frontend needs to send this in the body of the request.
  const { billDetails } = await req.json();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();

    const appointment = await Appointment.findById(appointmentId).session(session);
    if (!appointment) throw new Error('Appointment not found.');
    if (appointment.status !== 'Billed') throw new Error(`Cannot process payment. Status is "${appointment.status}".`);

    // ===> THIS IS THE CORRECTED LOGIC <===
    // 1. Calculate points based on the number of services on the bill.
    // We count the items in the billDetails that are of type 'service'.
    const pointsToAward = billDetails?.items?.filter((item: any) => item.itemType === 'service').length || 0;

    // --- Perform ALL Database Updates in a Transaction ---
    // 2. Update Appointment Status
    appointment.status = 'Paid';
    await appointment.save({ session });

    // 3. Release the Stylist
    await Stylist.updateOne(
      { _id: appointment.stylistId },
      { availabilityStatus: 'Available', currentAppointmentId: null },
      { session }
    );
    
    // 4. Award Loyalty Points to the Customer (if any)
    if (pointsToAward > 0) {
      await Customer.updateOne(
        { _id: appointment.customerId },
        { $inc: { loyaltyPoints: pointsToAward } },
        { session }
      );
      // 5. Log the Loyalty Transaction
      await LoyaltyTransaction.create([{
        customerId: appointment.customerId,
        points: pointsToAward,
        type: 'Credit',
        reason: `Earned from ${pointsToAward} service(s) in appointment`,
        relatedAppointmentId: appointment._id,
      }], { session });
    }
    
    await session.commitTransaction();

    return NextResponse.json({ success: true, message: `Payment complete. ${pointsToAward} points awarded. Stylist is now available.` });

  } catch (err: any) {
    await session.abortTransaction();
    console.error('API Error during payment:', err);
    return NextResponse.json({ success: false, message: err.message || 'Payment processing failed.' }, { status: 500 });
  } finally {
    session.endSession();
  }
}