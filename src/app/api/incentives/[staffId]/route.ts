// app/api/incentives/calculation/[staffId]/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale, { IDailySale } from '@/models/DailySale';
import Staff from '@/models/staff';
import IncentiveRule from '@/models/IncentiveRule';

export const dynamic = 'force-dynamic';

interface IRule {
  type: 'daily' | 'monthly';
  target: { multiplier: number };
  sales: { includeServiceSale: boolean; includeProductSale: boolean; reviewNameValue: number; reviewPhotoValue: number; };
  incentive: { rate: number; doubleRate: number; applyOn: 'totalSaleValue' | 'serviceSaleOnly'; };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calculateIncentiveWithDoubleTarget(achievedValue: number, targetValue: number, rule: IRule, baseForIncentive: number) {
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

export async function GET(request: Request, { params }: { params: { staffId: string } }) {
  try {
    await dbConnect();
    const { staffId } = params;
    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date');

    if (!dateQuery) {
      return NextResponse.json({ message: 'Date query parameter is required.' }, { status: 400 });
    }

    const staff = await Staff.findById(staffId).lean();
    if (!staff) return NextResponse.json({ message: 'Staff member not found.' }, { status: 404 });
    if (!staff.salary) return NextResponse.json({ message: 'Cannot calculate: Staff salary is not set.' }, { status: 400 });

    const [year, month, day] = dateQuery.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    const dailySaleRecord = await DailySale.findOne({ staff: staffId, date: targetDate }).lean<IDailySale>();
    let dailyResult = {};

    if (dailySaleRecord) {
      // ✨ --- START: Robust Rule Determination Logic ---
      let dailyRuleToUse: IRule;
      let ruleUsedSource = '';

      if (dailySaleRecord.appliedRule && dailySaleRecord.appliedRule.target) {
        // PRIORITY 1: A rule was snapshotted on the record. ALWAYS use this for consistency.
        ruleUsedSource = 'Snapshotted Rule (Historical)';
        dailyRuleToUse = { type: 'daily', ...dailySaleRecord.appliedRule };
      } else {
        // PRIORITY 2 (FALLBACK): Only triggered for old data without a snapshot.
        // After running the data migration script, this path should rarely be taken.
        console.warn(`[Incentive Calc] Fallback rule used for staff ${staffId} on ${dateQuery}. Record is missing 'appliedRule'.`);
        ruleUsedSource = 'Current Rule (Fallback)';
        const defaultDaily: IRule = { type: 'daily', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' } };
        const dailyRuleDb = await IncentiveRule.findOne({ type: 'daily' }).lean<IRule>();
        dailyRuleToUse = dailyRuleDb ? { ...defaultDaily, ...dailyRuleDb, incentive: { ...defaultDaily.incentive, ...(dailyRuleDb.incentive || {}) } } : defaultDaily;
      }
      // ✨ --- END: Rule Determination Logic ---

      const daysInMonth = getDaysInMonth(targetDate.getUTCFullYear(), targetDate.getUTCMonth());
      const dailyTarget = (staff.salary * dailyRuleToUse.target.multiplier) / daysInMonth;

      const dailyAchievedValue =
        (dailyRuleToUse.sales.includeServiceSale ? dailySaleRecord.serviceSale : 0) +
        (dailyRuleToUse.sales.includeProductSale ? dailySaleRecord.productSale : 0) +
        (dailySaleRecord.reviewsWithName * dailyRuleToUse.sales.reviewNameValue) +
        (dailySaleRecord.reviewsWithPhoto * dailyRuleToUse.sales.reviewPhotoValue);

      const dailyBaseForIncentive = dailyRuleToUse.incentive.applyOn === 'serviceSaleOnly'
        ? dailySaleRecord.serviceSale
        : dailyAchievedValue;
      
      const { incentive, isTargetMet, appliedRate } = calculateIncentiveWithDoubleTarget(dailyAchievedValue, dailyTarget, dailyRuleToUse, dailyBaseForIncentive);
      
      dailyResult = { 
        targetValue: dailyTarget, 
        achievedValue: dailyAchievedValue, 
        incentiveAmount: incentive,
        isTargetMet, 
        appliedRate,
        ruleUsedSource // Essential for debugging!
      };
    }

    // --- Incentive 2: Monthly Target Calculation (No changes needed here) ---
    const defaultMonthly: IRule = { type: 'monthly', target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: false, reviewNameValue: 0, reviewPhotoValue: 0 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'serviceSaleOnly' } };
    const monthlyRuleDb = await IncentiveRule.findOne({ type: 'monthly' }).lean<IRule>();
    const monthlyRule: IRule = monthlyRuleDb ? { ...defaultMonthly, ...monthlyRuleDb, incentive: { ...defaultMonthly.incentive, ...(monthlyRuleDb.incentive || {}) } } : defaultMonthly;
    
    const startDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0, 23, 59, 59));
    
    const monthlySalesData = await DailySale.find({ staff: staffId, date: { $gte: startDate, $lte: endDate } });
    
    const totalMonthlyServiceSale = monthlySalesData.reduce((sum, sale) => sum + sale.serviceSale, 0);
    const totalMonthlyProductSale = monthlySalesData.reduce((sum, sale) => sum + sale.productSale, 0);
    const monthlyTarget = staff.salary * monthlyRule.target.multiplier;

    const monthlyAchievedValue = (monthlyRule.sales.includeServiceSale ? totalMonthlyServiceSale : 0) + (monthlyRule.sales.includeProductSale ? totalMonthlyProductSale : 0);
    const monthlyBaseForIncentive = monthlyRule.incentive.applyOn === 'serviceSaleOnly' ? totalMonthlyServiceSale : monthlyAchievedValue;
    
    const { incentive: monthlyIncentive, isTargetMet: isMonthlyTargetMet, appliedRate: monthlyAppliedRate } = calculateIncentiveWithDoubleTarget(monthlyAchievedValue, monthlyTarget, monthlyRule, monthlyBaseForIncentive);
    
    const monthlyResult = { 
      targetValue: monthlyTarget, 
      achievedValue: monthlyAchievedValue, 
      incentiveAmount: monthlyIncentive, 
      isTargetMet: isMonthlyTargetMet, 
      appliedRate: monthlyAppliedRate, 
      totalMonthlyServiceSale 
    };

    return NextResponse.json({
      staffName: staff.name,
      calculationDate: targetDate.toISOString().split('T')[0],
      incentive1_daily: dailyResult,
      incentive2_monthly: monthlyResult,
    });

  } catch (error: any) {
    console.error("API GET /incentives/calculation/[staffId] Error:", error);
    return NextResponse.json({ message: 'An internal server error occurred.', error: error.message }, { status: 500 });
  }
}