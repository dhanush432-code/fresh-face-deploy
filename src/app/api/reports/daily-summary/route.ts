import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Invoice from '@/models/invoice';
import DayEndReport from '@/models/DayEndReport';
import Expense from '@/models/Expense';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, message: "Invalid date format. Please use YYYY-MM-DD." }, { status: 400 });
    }

    await dbConnect();

    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    const [paidInvoices, lastClosingReport, dailyExpenses] = await Promise.all([
      Invoice.find({ paymentStatus: 'Paid', createdAt: { $gte: startDate, $lte: endDate } }).lean(),
      DayEndReport.findOne({ closingDate: { $lt: startDate } }).sort({ closingDate: -1 }).lean(),
      Expense.find({ date: { $gte: startDate, $lte: endDate } }).lean()
    ]);

    const expectedTotals = paidInvoices.reduce((acc, inv) => {
      acc.total += inv.grandTotal || 0;
      if (inv.paymentDetails && typeof inv.paymentDetails === 'object') {
        for (const [method, amount] of Object.entries(inv.paymentDetails)) {
          if (typeof amount === 'number') {
            acc[method] = (acc[method] || 0) + amount;
          }
        }
      }
      return acc;
    }, { cash: 0, card: 0, upi: 0, other: 0, total: 0 } as any);

    // <-- THE FIX: Read the opening balance from the new, correct field name.
    const openingBalance = lastClosingReport?.actualTotals?.totalCountedCash || 0;
    
    const totalCashExpenses = dailyExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    return NextResponse.json({
      success: true,
      data: {
        openingBalance,
        expectedTotals,
        pettyCash: {
          total: totalCashExpenses,
          entries: dailyExpenses.map(e => ({ 
            _id: e._id.toString(), 
            description: e.description || e.type,
            amount: e.amount 
          })),
        },
      },
    });

  } catch (error: any) {
    console.error("API Error in /api/reports/daily-summary:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}