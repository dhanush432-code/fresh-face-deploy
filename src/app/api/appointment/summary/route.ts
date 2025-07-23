import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Appointment from '@/models/Appointment'; // Your Appointment model

export async function GET() {
  try {
    await dbConnect();

    // The aggregation pipeline efficiently groups appointments by day in the database.
    const dailyCounts = await Appointment.aggregate([
      {
        // Stage 1: Group documents by the date part of the 'appointmentDateTime' field.
        $group: {
          _id: {
            // ** THIS IS THE CORRECTED LINE **
            // We now use '$appointmentDateTime' to match your schema.
            $dateToString: { format: "%Y-%m-%d", date: "$appointmentDateTime" }
          },
          // Count the number of documents in each group (i.e., appointments per day)
          count: { $sum: 1 } 
        }
      },
      {
        // Stage 2: Sort by date descending (optional but good practice)
        $sort: { _id: -1 }
      }
    ]);

    // The result from aggregation is an array like: [{ _id: '2023-10-25', count: 8 }]
    // We transform it into an object like: { '2023-10-25': 8 } for easy lookup on the frontend.
    const countsMap = dailyCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);


    return NextResponse.json({ success: true, counts: countsMap });

  } catch (error) {
    console.error("Failed to fetch appointment summary:", error);
    // Provide a more detailed error log on the server for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}