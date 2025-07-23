export const dynamic = 'force-dynamic';

// app/api/stylists/available/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Stylist from '@/models/Stylist';
import Appointment from '@/models/Appointment';
import ServiceItem from '@/models/ServiceItem'; // Changed from Service to ServiceItem
import { addMinutes, areIntervalsOverlapping } from 'date-fns';

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const serviceIds = searchParams.getAll('serviceIds');

    if (serviceIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one service is required.' },
        { status: 400 }
      );
    }

    // Use ServiceItem instead of Service
    const servicesForDuration = await ServiceItem.find({ 
      _id: { $in: serviceIds } 
    }).select('duration').lean();

    if (servicesForDuration.length !== serviceIds.length) {
      throw new Error("One or more selected services could not be found.");
    }

    // Get all available stylists
    const availableStylists = await Stylist.find({
      isAvailable: true // Only get available stylists
    }).select('name experience specialization').lean();

    // Format for frontend
    const formattedStylists = availableStylists.map(stylist => ({
      _id: stylist._id,
      id: stylist._id.toString(),
      name: stylist.name,
      experience: stylist.experience,
      specialization: stylist.specialization
    }));

    return NextResponse.json({ 
      success: true, 
      stylists: formattedStylists 
    });

  } catch (error: any) {
    console.error("API Error fetching available stylists:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}