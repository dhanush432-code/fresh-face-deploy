// app/api/appointments/[id]/cancel/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Stylist from '@/models/Stylist';
import mongoose from 'mongoose';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const appointmentId = params.id;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return NextResponse.json({ success: false, message: 'Invalid Appointment ID.' }, { status: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();

    const appointment = await Appointment.findById(appointmentId).session(session);
    if (!appointment) throw new Error('Appointment not found.');
    if (['Paid', 'Cancelled'].includes(appointment.status)) {
      throw new Error(`Cannot cancel an appointment with status "${appointment.status}".`);
    }

    const originalStatus = appointment.status;
    appointment.status = 'Cancelled';
    await appointment.save({ session });

    // If the appointment was in-progress, release the stylist
    if (originalStatus === 'Checked-In') {
      await Stylist.updateOne(
        { _id: appointment.stylistId },
        { availabilityStatus: 'Available', currentAppointmentId: null },
        { session }
      );
    }
    
    await session.commitTransaction();
    return NextResponse.json({ success: true, message: 'Appointment has been cancelled.' });

  } catch (err: any) {
    await session.abortTransaction();
    return NextResponse.json({ success: false, message: err.message || 'Cancellation failed.' }, { status: 500 });
  } finally {
    session.endSession();
  }
}