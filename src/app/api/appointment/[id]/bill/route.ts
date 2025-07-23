// app/api/appointments/[id]/bill/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import mongoose from 'mongoose';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const appointmentId = params.id;

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return NextResponse.json({ success: false, message: 'Invalid Appointment ID.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const { finalTotal } = await req.json();

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found.');
    if (appointment.status !== 'Checked-In') throw new Error(`Cannot bill. Status is already "${appointment.status}".`);

    // --- Perform Update ---
    appointment.status = 'Billed';
    appointment.amount = finalTotal; // Save the final amount to the appointment
    await appointment.save();

    return NextResponse.json({ success: true, message: 'Appointment has been billed.', appointment });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Billing failed.' }, { status: 500 });
  }
}