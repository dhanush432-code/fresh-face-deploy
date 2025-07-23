// app/api/appointment/[id]/status/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Stylist from '@/models/Stylist';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const { action, notes } = await req.json();

    const appointment = await Appointment.findById(id).populate('stylistId');
    if (!appointment) {
      return NextResponse.json({ success: false, message: "Appointment not found." }, { status: 404 });
    }

    const currentTime = new Date();
    let updatedData: any = {};

    switch (action) {
      case 'check-in':
        if (appointment.status !== 'Appointment') {
          return NextResponse.json({ success: false, message: "Can only check-in appointments with 'Appointment' status." }, { status: 400 });
        }
        
        updatedData = {
          status: 'Checked-In',
          checkInTime: currentTime
        };
        
        // Lock the stylist
        // if (appointment.stylistId) {
        //   const stylist = await Stylist.findById(appointment.stylistId._id);
        //   if (stylist) {
        //     await stylist.lockStylist(appointment._id);
        //   }
        // }
        break;

      case 'check-out':
        if (appointment.status !== 'Checked-In') {
          return NextResponse.json({ success: false, message: "Can only check-out appointments with 'Checked-In' status." }, { status: 400 });
        }
        
        // Calculate actual duration
        const actualDuration = appointment.checkInTime 
          ? Math.round((currentTime.getTime() - appointment.checkInTime.getTime()) / (1000 * 60))
          : appointment.estimatedDuration;
        
        updatedData = {
          status: 'Checked-Out',
          checkOutTime: currentTime,
          actualDuration: actualDuration
        };
        
        // Unlock the stylist
        // if (appointment.stylistId) {
        //   const stylist = await Stylist.findById(appointment.stylistId._id);
        //   if (stylist) {
        //     await stylist.unlockStylist();
        //   }
        // }
        break;

      case 'cancel':
        if (['Paid', 'Cancelled', 'No-Show'].includes(appointment.status)) {
          return NextResponse.json({ success: false, message: "Cannot cancel appointment with this status." }, { status: 400 });
        }
        
        updatedData = {
          status: 'Cancelled',
          cancelledTime: currentTime,
          notes: notes || appointment.notes
        };
        
        // Unlock the stylist if they were locked
        // if (appointment.status === 'Checked-In' && appointment.stylistId) {
        //   const stylist = await Stylist.findById(appointment.stylistId._id);
        //   if (stylist) {
        //     await stylist.unlockStylist();
        //   }
        // }
        break;

      case 'mark-paid':
        if (appointment.status !== 'Checked-Out') {
          return NextResponse.json({ success: false, message: "Can only mark as paid appointments with 'Checked-Out' status." }, { status: 400 });
        }
        
        updatedData = {
          status: 'Paid'
        };
        break;

      default:
        return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    ).populate(['customerId', 'stylistId', 'serviceIds']);

    return NextResponse.json({ 
      success: true, 
      appointment: updatedAppointment,
      message: `Appointment ${action} successful.`
    });

  } catch (error: any) {
    console.error("API Error updating appointment status:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}