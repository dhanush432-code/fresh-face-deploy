// app/api/stylist-history/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get stylistId from query parameters
    const { searchParams } = new URL(req.url);
    const stylistId = searchParams.get('stylistId');

    if (!stylistId) {
        return NextResponse.json({ success: false, message: 'Stylist ID is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(stylistId)) {
      return NextResponse.json({ success: false, message: 'Invalid Stylist ID' }, { status: 400 });
    }

    // Find all 'Paid' appointments for the given stylist
    const appointments = await Appointment.find({
      stylistId: new mongoose.Types.ObjectId(stylistId),
      status: 'Paid'
    })
    .populate({ path: 'customerId', select: 'name' })
    .populate({ path: 'serviceIds', select: 'name duration' })
    .sort({ appointmentTime: -1 });

    console.log(`Fetched ${appointments} appointments for stylist ${stylistId}`);
    

    const history = appointments.map(apt => {
      // Calculate actual duration in minutes from check-in to payment (updatedAt)
      let actualDuration = 0;
      if (apt.checkInTime && apt.updatedAt) {
        const checkIn = new Date(apt.checkInTime);
        const paidAt = new Date(apt.checkOutTime);
        actualDuration = Math.round((paidAt.getTime() - checkIn.getTime()) / 60000);
      }

      console.log(actualDuration);
      

      // Format the data for the frontend
      return {
        _id: apt._id.toString(),
        date: apt.appointmentDateTime,
        customerName: (apt.customerId as any)?.name || 'N/A',
        services: (apt.serviceIds as any[]).map(s => s.name).join(', '),
        amount: apt.finalAmount,
        // sum of service.duration from service-item
        estimatedDuration: apt.estimatedDuration, 
        // time from check-in to checkout (paid)
        actualDuration: actualDuration 
      };
    });

    return NextResponse.json({ success: true, data: history });

  } catch (error: any) {
    console.error(`Failed to fetch appointment history:`, error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}