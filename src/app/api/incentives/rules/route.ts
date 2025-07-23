// app/api/incentives/rules/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import IncentiveRule from '@/models/IncentiveRule';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

// The interface for our Rule object, ensuring type safety.
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

// A reusable function to check user permissions
async function checkPermissions(permission: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role?.permissions) {
    return { error: 'Authentication required.', status: 401 };
  }
  if (!hasPermission(session.user.role.permissions, permission)) {
    return { error: 'You do not have permission to perform this action.', status: 403 };
  }
  return null; 
}

// GET: Fetch the current rules
export async function GET() {
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_INCENTIVES_READ);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }
  
  await dbConnect();
  try {
    const dailyRuleDb = await IncentiveRule.findOne({ type: 'daily' }).lean<IRule>();
    const monthlyRuleDb = await IncentiveRule.findOne({ type: 'monthly' }).lean<IRule>();

    // Define complete default objects to act as a fallback and ensure a full object is always returned.
    const defaultDaily: IRule = {
      type: 'daily',
      target: { multiplier: 5 },
      sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 },
      incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' }
    };
    const defaultMonthly: IRule = {
      type: 'monthly',
      target: { multiplier: 5 },
      sales: { includeServiceSale: true, includeProductSale: false, reviewNameValue: 0, reviewPhotoValue: 0 },
      incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'serviceSaleOnly' }
    };

    // Deep merge defaults with the rules found in the database.
    const daily: IRule = {
        ...defaultDaily,
        ...dailyRuleDb,
        incentive: { ...defaultDaily.incentive, ...(dailyRuleDb?.incentive || {}) },
        sales: { ...defaultDaily.sales, ...(dailyRuleDb?.sales || {}) },
        target: { ...defaultDaily.target, ...(dailyRuleDb?.target || {}) },
    };
    const monthly: IRule = {
        ...defaultMonthly,
        ...monthlyRuleDb,
        incentive: { ...defaultMonthly.incentive, ...(monthlyRuleDb?.incentive || {}) },
        sales: { ...defaultMonthly.sales, ...(monthlyRuleDb?.sales || {}) },
        target: { ...defaultMonthly.target, ...(monthlyRuleDb?.target || {}) },
    };

    return NextResponse.json({ daily, monthly });

  } catch (error: any) {
    console.error("API GET /api/incentives/rules Error:", error);
    return NextResponse.json({ message: 'Error fetching rules', error: error.message }, { status: 500 });
  }
}

// POST: Create or Update rules
export async function POST(request: Request) {
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_INCENTIVES_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }
  
  await dbConnect();
  try {
    const { daily, monthly } = await request.json();

    // Use findOneAndUpdate with upsert to create the rule if it doesn't exist, or update it if it does.
    if (daily) {
      await IncentiveRule.findOneAndUpdate({ type: 'daily' }, daily, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    if (monthly) {
      await IncentiveRule.findOneAndUpdate({ type: 'monthly' }, monthly, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    return NextResponse.json({ message: 'Incentive rules saved successfully!' }, { status: 200 });

  } catch (error: any) {
    console.error("API POST /api/incentives/rules Error:", error);
    return NextResponse.json({ message: 'Error saving rules', error: error.message }, { status: 500 });
  }
}