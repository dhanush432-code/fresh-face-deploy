// File: app/api/incentives/report/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale';
import Staff from '@/models/staff';
import IncentiveRule from '@/models/IncentiveRule';

export const dynamic = 'force-dynamic';

// Interface for our Rule object (reused from your code)
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

// Helper Function (reused from your code)
function calculateIncentiveWithDoubleTarget(
  achievedValue: number,
  targetValue: number,
  rule: IRule,
  baseForIncentive: number
) {
  let incentive = 0;
  let appliedRate = 0;
  const isTargetMet = achievedValue >= targetValue;

  if (isTargetMet) {
    const doubleTargetValue = targetValue * 2;
    if (achievedValue >= doubleTargetValue) {
      appliedRate = rule.incentive.doubleRate;
      incentive = baseForIncentive * rule.incentive.doubleRate;
    } else {
      appliedRate = rule.incentive.rate;
      incentive = baseForIncentive * rule.incentive.rate;
    }
  }

  return { incentive, isTargetMet, appliedRate };
}

// ===================================================================
//  NEW: Main GET Handler for Bulk Reports
//  This function fetches incentive data for ALL staff for a given date.
// ===================================================================
export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date');

    if (!dateQuery) {
      return NextResponse.json({ message: 'Date query parameter is required.' }, { status: 400 });
    }

    // --- Step 1: Fetch all staff and rules (once) ---
    const allStaff = await Staff.find({ salary: { $exists: true, $gt: 0 } }).lean();
    if (!allStaff.length) {
      return NextResponse.json({ data: [], message: 'No staff with salary found.' }, { status: 200 });
    }

    const defaultDaily: IRule = { type: 'daily', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' } };
    const defaultMonthly: IRule = { type: 'monthly', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: false, reviewNameValue: 0, reviewPhotoValue: 0 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'serviceSaleOnly' } };
    
    const dailyRuleDb = await IncentiveRule.findOne({ type: 'daily' }).lean<IRule>();
    const monthlyRuleDb = await IncentiveRule.findOne({ type: 'monthly' }).lean<IRule>();

    const dailyRule: IRule = dailyRuleDb ? { ...defaultDaily, ...dailyRuleDb, incentive: { ...defaultDaily.incentive, ...dailyRuleDb.incentive } } : defaultDaily;
    const monthlyRule: IRule = monthlyRuleDb ? { ...defaultMonthly, ...monthlyRuleDb, incentive: { ...defaultMonthly.incentive, ...monthlyRuleDb.incentive } } : defaultMonthly;
    
    const targetDate = new Date(dateQuery);
    targetDate.setHours(0, 0, 0, 0);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // --- Step 2: Process each staff member in parallel ---
    const reportPromises = allStaff.map(async (staff) => {
      // --- Incentive 1: Daily Target Calculation ---
      const dailySaleRecord = await DailySale.findOne({ staff: staff._id, date: targetDate });
      let dailyResult = {};

      if (dailySaleRecord && staff.salary) {
          const dailyTarget = (staff.salary * dailyRule.target.multiplier) / daysInMonth;
          
          const dailyAchievedValue = 
              (dailyRule.sales.includeServiceSale ? dailySaleRecord.serviceSale : 0) + 
              (dailyRule.sales.includeProductSale ? dailySaleRecord.productSale : 0) +
              (dailySaleRecord.reviewsWithName * dailyRule.sales.reviewNameValue) +
              (dailySaleRecord.reviewsWithPhoto * dailyRule.sales.reviewPhotoValue);

          const dailyBaseForIncentive = dailyRule.incentive.applyOn === 'serviceSaleOnly' 
              ? dailySaleRecord.serviceSale 
              : dailyAchievedValue;
          
          const { incentive, isTargetMet, appliedRate } = calculateIncentiveWithDoubleTarget(dailyAchievedValue, dailyTarget, dailyRule, dailyBaseForIncentive);
          
          dailyResult = { 
              targetValue: dailyTarget, 
              totalSaleValue: dailyAchievedValue, // Use a consistent name
              incentiveAmount: incentive,
              isTargetMet, 
              incentiveRate: appliedRate // Use a consistent name
          };
      }

      // --- Incentive 2: Monthly Target Calculation ---
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      const monthlySalesData = await DailySale.find({ staff: staff._id, date: { $gte: startDate, $lte: endDate } });
      
      let monthlyResult = {};
      if (staff.salary) {
        const totalMonthlyServiceSale = monthlySalesData.reduce((sum, sale) => sum + sale.serviceSale, 0);
        const totalMonthlyProductSale = monthlySalesData.reduce((sum, sale) => sum + sale.productSale, 0);
        const monthlyTarget = staff.salary * monthlyRule.target.multiplier;

        const monthlyAchievedValue = (monthlyRule.sales.includeServiceSale ? totalMonthlyServiceSale : 0) + (monthlyRule.sales.includeProductSale ? totalMonthlyProductSale : 0);
        const monthlyBaseForIncentive = monthlyRule.incentive.applyOn === 'serviceSaleOnly' ? totalMonthlyServiceSale : monthlyAchievedValue;
        
        const { incentive: monthlyIncentive, isTargetMet: isMonthlyTargetMet, appliedRate: monthlyAppliedRate } = calculateIncentiveWithDoubleTarget(monthlyAchievedValue, monthlyTarget, monthlyRule, monthlyBaseForIncentive);
        
        monthlyResult = { 
          monthlyTarget: monthlyTarget, // Use a consistent name
          achievedValue: monthlyAchievedValue, 
          incentiveAmount: monthlyIncentive, 
          isTargetMet: isMonthlyTargetMet, 
          incentiveRate: monthlyAppliedRate, // Use a consistent name
          totalMonthlyServiceSale 
        };
      }

      return {
        staffId: staff._id,
        staffName: staff.name,
        calculationDate: targetDate.toISOString().split('T')[0],
        incentive1_daily: dailyResult,
        incentive2_monthly: monthlyResult,
      };
    });

    const reportData = await Promise.all(reportPromises);

    return NextResponse.json({ data: reportData });

  } catch (error: any) {
    console.error("API GET /incentives/report Error:", error);
    return NextResponse.json({ message: 'An internal server error occurred while generating the report.', error: error.message }, { status: 500 });
  }
}