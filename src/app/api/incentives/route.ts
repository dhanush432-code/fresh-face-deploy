// app/api/incentives/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale';
import Staff from '@/models/staff';
import IncentiveRule from '@/models/IncentiveRule';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

// Interface for a full rule object, used for fetching from the DB.
interface IRule {
  type: 'daily' | 'monthly';
  target: { multiplier: number };
  sales: { includeServiceSale: boolean; includeProductSale: boolean; reviewNameValue: number; reviewPhotoValue: number; };
  incentive: { rate: number; doubleRate: number; applyOn: 'totalSaleValue' | 'serviceSaleOnly'; };
}

// Reusable permission checker
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

export async function POST(request: Request) {
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_INCENTIVES_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  try {
    await dbConnect();
    const body = await request.json();
    const { staffId, date, serviceSale = 0, productSale = 0, customerCount = 0, reviewsWithName = 0, reviewsWithPhoto = 0 } = body;

    if (!staffId || !date) {
      return NextResponse.json({ message: 'Staff ID and date are required.' }, { status: 400 });
    }
    const staffExists = await Staff.findById(staffId);
    if (!staffExists) {
      return NextResponse.json({ message: 'Staff not found.' }, { status: 404 });
    }

    // ✨ --- START: Rule Snapshot Logic ---
    // This is the most critical part for ensuring future data consistency.
    
    // 1. Define a robust default rule as a fallback in case the DB rule is missing.
    const defaultDaily: Omit<IRule, 'type'> = { target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' } };
    
    // 2. Fetch the current daily rule from the database.
    const dailyRuleDb = await IncentiveRule.findOne({ type: 'daily' }).lean<IRule>();
    
    // 3. Create the clean snapshot object to be saved.
    //    It merges the DB rule over the default to ensure all fields are present.
    const ruleSnapshot = {
        target: { ...defaultDaily.target, ...(dailyRuleDb?.target || {}) },
        sales: { ...defaultDaily.sales, ...(dailyRuleDb?.sales || {}) },
        incentive: { ...defaultDaily.incentive, ...(dailyRuleDb?.incentive || {}) }
    };
    // ✨ --- END: Rule Snapshot Logic ---

    // Use UTC date to avoid timezone issues.
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    
    const updatedRecord = await DailySale.findOneAndUpdate(
      { staff: staffId, date: targetDate },
      { 
        $inc: { 
          serviceSale, 
          productSale, 
          customerCount,
          reviewsWithName,
          reviewsWithPhoto,
        },
        // ✨ KEY FIX: Use $set to save or update the rule snapshot every time data is logged.
        // This attaches the rule that was active AT THAT MOMENT to the record itself.
        $set: {
          appliedRule: ruleSnapshot
        }
      },
      { 
        new: true,
        upsert: true, // Creates the record if it doesn't exist
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({ message: 'Daily data updated successfully', data: updatedRecord }, { status: 200 });

  } catch (error: any) {
    console.error("API POST /api/incentives Error:", error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred', error: error.message }, { status: 500 });
  }
}