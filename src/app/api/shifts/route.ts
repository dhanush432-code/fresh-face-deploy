// /app/api/shifts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb'; // Adjust path if needed
import Shift from '../../../models/Shift'; // The new model we just created

/**
 * GET: Fetch shifts for a given date range (e.g., a week)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'startDate and endDate are required' }, { status: 400 });
    }

    const shifts = await Shift.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).lean();

    return NextResponse.json({ success: true, data: shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to fetch shifts: ${message}` }, { status: 500 });
  }
}

/**
 * POST: Bulk create or update shifts (Upsert)
 * This is how we save the entire week's schedule at once.
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const shiftsToSave: Array<{ employeeId: string; date: string; isWeekOff: boolean; shiftTiming: string }> = await request.json();

    if (!Array.isArray(shiftsToSave) || shiftsToSave.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid or empty data payload' }, { status: 400 });
    }
    
    // Use bulkWrite for efficient bulk upserts (update if exists, insert if not)
    const bulkOps = shiftsToSave.map(shift => ({
      updateOne: {
        filter: { 
          employeeId: shift.employeeId, 
          date: new Date(new Date(shift.date).setUTCHours(0, 0, 0, 0)) // Normalize date to start of day
        },
        update: {
          $set: {
            isWeekOff: shift.isWeekOff,
            shiftTiming: shift.shiftTiming,
            employeeId: shift.employeeId,
            date: new Date(new Date(shift.date).setUTCHours(0, 0, 0, 0))
          }
        },
        upsert: true, // This is the key: it creates the doc if it doesn't exist
      },
    }));

    const result = await Shift.bulkWrite(bulkOps);

    return NextResponse.json({ success: true, data: result }, { status: 200 });

  } catch (error) {
    console.error('Error saving shifts:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to save shifts: ${message}` }, { status: 500 });
  }
}