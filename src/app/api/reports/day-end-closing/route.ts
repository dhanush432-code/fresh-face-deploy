import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import DayEndReport from '@/models/DayEndReport';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { sendClosingReportEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_CREATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      closingDate,
      openingBalance,
      isOpeningBalanceManual,
      pettyCash,
      expectedTotals,
      actualTotals,
      discrepancies,
      cashDenominations,
      notes,
    } = body;

    if (!closingDate) {
      return NextResponse.json({ success: false, message: "Closing date is required" }, { status: 400 });
    }
    
    await dbConnect();
    
    const existingReport = await DayEndReport.findOne({ closingDate: new Date(closingDate) });
    if (existingReport) {
      return NextResponse.json({ success: false, message: `A report for ${closingDate} already exists.` }, { status: 409 });
    }

    const newReport = new DayEndReport({
      closingDate: new Date(closingDate),
      openingBalance,
      isOpeningBalanceManual,
      pettyCash: {
        total: pettyCash.total,
        expenseIds: pettyCash.entries.map((entry: any) => entry._id),
      },
      expectedTotals,
      // --- THE FIX: Map the incoming frontend data to the correct schema structure ---
      actualTotals: {
        totalCountedCash: actualTotals.cash, // Map 'cash' from modal to 'totalCountedCash'
        card: actualTotals.card,
        upi: actualTotals.upi,
        other: actualTotals.other,
        total: (actualTotals.cash || 0) + (actualTotals.card || 0) + (actualTotals.upi || 0) + (actualTotals.other || 0),
      },
      discrepancies,
      cashDenominations,
      notes,
      closedBy: session.user.id,
    });

    await newReport.save();

    sendClosingReportEmail(body);
    
    return NextResponse.json({
      success: true,
      message: `Day-end report for ${closingDate} submitted successfully.`,
      reportId: newReport._id,
    }, { status: 201 });

  } catch (error: any) {
    console.error("API Error in /api/reports/day-end-closing:", error);
    return NextResponse.json({ success: false, message: "An internal server error occurred." }, { status: 500 });
  }
}