// app/api/incentives/report/monthly/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale, { IDailySale } from '@/models/DailySale';
import Staff, { IStaff } from '@/models/staff'; // Assuming IStaff is exported from your staff model
import IncentiveRule from '@/models/IncentiveRule';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Interface for a full rule object.
interface IRule {
  type: 'daily' | 'monthly';
  target: { multiplier: number };
  sales: {
    includeServiceSale: boolean;
    includeProductSale: boolean;
    reviewNameValue: number;
    reviewPhotoValue: number;
  };
  incentive: {
    rate: number;
    doubleRate: number;
    applyOn: 'totalSaleValue' | 'serviceSaleOnly';
  };
}

// Reusable permission checker
async function checkPermissions(permission: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role?.permissions) {
    return { error: 'Authentication required.', status: 401 };
  }
  if (!hasPermission(session.user.role.permissions, permission)) {
    return { error: 'You do not have permission to view reports.', status: 403 };
  }
  return null;
}

// Helper function: Get actual days in a specific month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Helper function: Calculates incentive
function calculateIncentiveWithDoubleTarget(
  achievedValue: number,
  targetValue: number,
  rule: IRule,
  baseForIncentive: number
) {
  let incentive = 0;
  const isTargetMet = achievedValue >= targetValue;

  if (isTargetMet) {
    const doubleTargetValue = targetValue * 2;
    if (achievedValue >= doubleTargetValue) {
      incentive = baseForIncentive * rule.incentive.doubleRate;
    } else {
      incentive = baseForIncentive * rule.incentive.rate;
    }
  }
  return { incentive, isTargetMet };
}

// MAIN GET HANDLER FOR THE REPORT
export async function GET(request: Request) {
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_INCENTIVES_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, message: permissionCheck.error }, { status: permissionCheck.status });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDateQuery = searchParams.get('startDate');
    const endDateQuery = searchParams.get('endDate');

    if (!startDateQuery || !endDateQuery) {
      return NextResponse.json({ message: 'Start date and end date query parameters are required.' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(parseInt(startDateQuery.split('-')[0]), parseInt(startDateQuery.split('-')[1]) - 1, parseInt(startDateQuery.split('-')[2])));
    const endDate = new Date(Date.UTC(parseInt(endDateQuery.split('-')[0]), parseInt(endDateQuery.split('-')[1]) - 1, parseInt(endDateQuery.split('-')[2]), 23, 59, 59));

    const allStaff = await Staff.find({ salary: { $exists: true, $gt: 0 } }).lean();
    const allSales: IDailySale[] = await DailySale.find({ date: { $gte: startDate, $lte: endDate } }).lean();

    const defaultDaily: IRule = { type: 'daily', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' } };
    const dailyRuleDb = await IncentiveRule.findOne({ type: 'daily' }).lean<IRule>();
    const currentDailyRule: IRule = dailyRuleDb ? { ...defaultDaily, ...dailyRuleDb, incentive: { ...defaultDaily.incentive, ...(dailyRuleDb.incentive || {}) } } : defaultDaily;

    const defaultMonthly: IRule = { type: 'monthly', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: false, reviewNameValue: 0, reviewPhotoValue: 0 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'serviceSaleOnly' } };
    const monthlyRuleDb = await IncentiveRule.findOne({ type: 'monthly' }).lean<IRule>();
    const currentMonthlyRule: IRule = monthlyRuleDb ? { ...defaultMonthly, ...monthlyRuleDb, incentive: { ...defaultMonthly.incentive, ...(monthlyRuleDb.incentive || {}) } } : defaultMonthly;
    
    const reportData = [];

    for (const staff of allStaff) {
      const staffSales = allSales.filter((sale: IDailySale) => sale.staff.toString() === staff._id.toString());
      if (staffSales.length === 0) continue; 

      let totalDailyIncentive = 0;
      let totalDailyAchievedValue = 0;
      let totalDailyTargetValue = 0;

      for (const sale of staffSales) {
        // ✨ FIX: Add the explicit type 'IRule' to the variable declaration.
        const ruleToUse: IRule = sale.appliedRule ? { type: 'daily', ...sale.appliedRule } : currentDailyRule;

        const saleDate = new Date(sale.date);
        const daysInMonth = getDaysInMonth(saleDate.getUTCFullYear(), saleDate.getUTCMonth());
        const dailyTarget = (staff.salary! * ruleToUse.target.multiplier) / daysInMonth;

        const dailyAchieved =
          (ruleToUse.sales.includeServiceSale ? sale.serviceSale : 0) +
          (ruleToUse.sales.includeProductSale ? sale.productSale : 0) +
          (sale.reviewsWithName * ruleToUse.sales.reviewNameValue) +
          (sale.reviewsWithPhoto * ruleToUse.sales.reviewPhotoValue);

        const dailyBaseForIncentive = ruleToUse.incentive.applyOn === 'serviceSaleOnly'
          ? sale.serviceSale
          : dailyAchieved;
        
        // Now this line is valid because `ruleToUse` is guaranteed to be of type IRule.
        const { incentive } = calculateIncentiveWithDoubleTarget(dailyAchieved, dailyTarget, ruleToUse, dailyBaseForIncentive);

        totalDailyIncentive += incentive;
        totalDailyAchievedValue += dailyAchieved;
        totalDailyTargetValue += dailyTarget;
      }
      
      const dailyResult = {
        targetValue: totalDailyTargetValue,
        totalSaleValue: totalDailyAchievedValue, 
        incentiveAmount: totalDailyIncentive,
      };

      const totalRangeServiceSale = staffSales.reduce((sum: number, sale: IDailySale) => sum + sale.serviceSale, 0);
      const totalRangeProductSale = staffSales.reduce((sum: number, sale: IDailySale) => sum + sale.productSale, 0);
      
      const monthlyTarget = staff.salary! * currentMonthlyRule.target.multiplier;
      
      const monthlyAchievedValue = (currentMonthlyRule.sales.includeServiceSale ? totalRangeServiceSale : 0) + (currentMonthlyRule.sales.includeProductSale ? totalRangeProductSale : 0);
      const monthlyBaseForIncentive = currentMonthlyRule.incentive.applyOn === 'serviceSaleOnly' ? totalRangeServiceSale : monthlyAchievedValue;
      
      const { incentive: monthlyIncentive } = calculateIncentiveWithDoubleTarget(monthlyAchievedValue, monthlyTarget, currentMonthlyRule, monthlyBaseForIncentive);

      const monthlyResult = {
        monthlyTarget: monthlyTarget,
        totalMonthlyServiceSale: monthlyAchievedValue,
        incentiveAmount: monthlyIncentive,
      };

      reportData.push({
        staffName: staff.name,
        incentive1_daily: dailyResult,
        incentive2_monthly: monthlyResult,
      });
    }

    return NextResponse.json({ success: true, data: reportData });

  } catch (error: any) {
    console.error("API GET /incentives/report/monthly Error:", error);
    return NextResponse.json({ message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}