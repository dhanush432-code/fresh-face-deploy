import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; 
import dbConnect from '@/lib/dbConnect';
import DayEndReport from '@/models/DayEndReport';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
  
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    await dbConnect();
    
    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setUTCHours(0, 0, 0, 0);

        const endDateObj = new Date(endDate);
        endDateObj.setUTCHours(23, 59, 59, 999);

        query.closingDate = {
            $gte: startDateObj,
            $lte: endDateObj,
        };
    }
    
    const reports = await DayEndReport.find(query)
      .sort({ closingDate: -1 })
      .populate('closedBy', 'name')
      .lean();
      
    // --- THE FIX: Add a data transformation layer for backward compatibility ---
    // This ensures that reports saved before the schema fix are also displayed correctly.
    const cleanedReports = reports.map(report => {
      const newReport = { ...report };
      // Check if this is an old report with the 'cash' field
      if (newReport.actualTotals && newReport.actualTotals.cash !== undefined) {
          // If so, create the 'totalCountedCash' field that the frontend expects
          newReport.actualTotals.totalCountedCash = newReport.actualTotals.cash;
      }
      return newReport;
    });
            
    return NextResponse.json({ success: true, data: cleanedReports }, { status: 200 });

  } catch (error: any) {
    console.error("API Error fetching day-end history:", error);
    return NextResponse.json(
      { success: false, message: "An internal server error occurred.", errorDetails: error.message },
      { status: 500 }
    );
  }
}