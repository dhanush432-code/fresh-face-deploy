// app/api/salary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import SalaryRecord, { ISalaryRecord } from '../../../models/SalaryRecord';
import Staff, { IStaff } from '../../../models/staff';
import mongoose from 'mongoose';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

// --- Interfaces for Payloads and Responses ---

// Interface updated to match the new schema and frontend payload
interface ProcessSalaryPayloadFE {
  staffId: string;
  month: string;
  year: number;
  baseSalary: number;
  otHours: number;
  otAmount: number;
  extraDays: number;
  extraDayPay: number;
  foodDeduction: number;
  recurExpense: number;
  totalEarnings: number;
  totalDeductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null;
}

interface PopulatedStaffDetailsFE {
  id: string;
  name: string;
  image?: string | null;
  position: string;
}

// Response interface updated to include all fields
interface SalaryRecordResponseFE {
  id: string;
  staffId: string;
  month: string;
  year: number;
  baseSalary: number;
  otHours: number;
  otAmount: number;
  extraDays: number;
  extraDayPay: number;
  foodDeduction: number;
  recurExpense: number;
  totalEarnings: number;
  totalDeductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  staffDetails?: PopulatedStaffDetailsFE | null;
}

// Helper updated to format all the new fields for the response
function formatRecordForResponse(
  record: any, // Using 'any' for simplicity as it handles both lean objects and Mongoose docs
  populatedStaffParam?: IStaff | null
): SalaryRecordResponseFE {
  let actualStaffIdString: string;
  let staffDetailsForResponse: PopulatedStaffDetailsFE | undefined = undefined;

  if (populatedStaffParam) {
    actualStaffIdString = populatedStaffParam._id.toString();
    staffDetailsForResponse = {
      id: actualStaffIdString,
      name: populatedStaffParam.name,
      image: populatedStaffParam.image || null,
      position: populatedStaffParam.position,
    };
  } else if (record.staffId && typeof record.staffId === 'object' && '_id' in record.staffId) {
    const directPopulatedStaff = record.staffId as IStaff;
    actualStaffIdString = directPopulatedStaff._id.toString();
    staffDetailsForResponse = {
      id: actualStaffIdString,
      name: directPopulatedStaff.name,
      image: directPopulatedStaff.image || null,
      position: directPopulatedStaff.position,
    };
  } else {
    actualStaffIdString = record.staffId.toString();
  }

  return {
    id: record._id.toString(),
    staffId: actualStaffIdString,
    month: record.month,
    year: record.year,
    baseSalary: record.baseSalary,
    otHours: record.otHours || 0,
    otAmount: record.otAmount || 0,
    extraDays: record.extraDays || 0,
    extraDayPay: record.extraDayPay || 0,
    foodDeduction: record.foodDeduction || 0,
    recurExpense: record.recurExpense || 0,
    totalEarnings: record.totalEarnings || 0,
    totalDeductions: record.totalDeductions || 0,
    advanceDeducted: record.advanceDeducted || 0,
    netSalary: record.netSalary,
    isPaid: record.isPaid,
    paidDate: record.paidDate ? new Date(record.paidDate).toISOString().split('T')[0] : null,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : undefined,
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : undefined,
    staffDetails: staffDetailsForResponse,
  };
}

async function checkPermissions(permission: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role?.permissions) {
    return { error: 'Authentication required.', status: 401 };
  }
  const userPermissions = session.user.role.permissions;
  if (!hasPermission(userPermissions, permission)) {
    return { error: 'You do not have permission to perform this action.', status: 403 };
  }
  return null; 
}

// --- POST Handler (No changes needed here, as it's flexible) ---
export async function POST(req: NextRequest) {

    const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_SALARY_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  try {
    await dbConnect();
    const payload = (await req.json()) as ProcessSalaryPayloadFE;

    if (!mongoose.Types.ObjectId.isValid(payload.staffId)) {
      return NextResponse.json({ success: false, error: 'Invalid staff ID format' }, { status: 400 });
    }
    
    // Convert to ObjectId for DB operations
    const staffObjectId = new mongoose.Types.ObjectId(payload.staffId);
    
    const salaryDataForDb = {
      ...payload,
      staffId: staffObjectId, 
      paidDate: payload.paidDate ? new Date(payload.paidDate) : null,
    };

    const salaryRecordDb = await SalaryRecord.findOneAndUpdate(
      {
        staffId: staffObjectId,
        month: payload.month,
        year: payload.year,
      },
      salaryDataForDb,
      { new: true, upsert: true, runValidators: true }
    ).lean();

    if (!salaryRecordDb) {
      return NextResponse.json({ success: false, error: 'Failed to process salary record.' }, { status: 500 });
    }

    const responseRecord = formatRecordForResponse(salaryRecordDb);
    return NextResponse.json({ success: true, data: responseRecord }, { status: 201 });
  } catch (error: any) {
    console.error('Error processing salary [POST /api/salary]:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'A salary record for this staff, month, and year already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to process salary' }, { status: 400 });
  }
}

// --- GET Handler (No changes needed here, as formatRecordForResponse is updated) ---
export async function GET(req: NextRequest) {

    const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_SALARY_READ);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }
                              
  // This function remains the same as your original, as the heavy lifting is done in the updated `formatRecordForResponse` helper.
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const staffIdParam = searchParams.get('staffId');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const populateStaffQuery = searchParams.get('populateStaff');

    const filterQuery: any = {};
    if (staffIdParam) {
        if (!mongoose.Types.ObjectId.isValid(staffIdParam)) {
            return NextResponse.json({ success: false, error: 'Invalid staff ID format for filter' }, { status: 400 });
        }
        filterQuery.staffId = new mongoose.Types.ObjectId(staffIdParam);
    }
    if (yearParam) filterQuery.year = parseInt(yearParam, 10);
    if (monthParam) filterQuery.month = monthParam;

    const salaryRecordsDb = await SalaryRecord.find(filterQuery)
                                            .sort({ year: -1, createdAt: -1 })
                                            .lean();

    let populatedStaffDetailsMap: Map<string, IStaff> = new Map();

    if (populateStaffQuery === 'true' && salaryRecordsDb.length > 0) {
      const uniqueStaffIds = [
        ...new Set(salaryRecordsDb.map(sr => sr.staffId.toString()).filter(id => mongoose.Types.ObjectId.isValid(id)))
      ].map(id => new mongoose.Types.ObjectId(id));

      if (uniqueStaffIds.length > 0) {
        const staffDocs = await Staff.find({ _id: { $in: uniqueStaffIds } })
                                     .select('name image position')
                                     .lean();
        staffDocs.forEach(staff => {
            if (staff && staff._id) {
                populatedStaffDetailsMap.set(staff._id.toString(), staff as IStaff);
            }
        });
      }
    }

    const formattedRecords: SalaryRecordResponseFE[] = salaryRecordsDb.map(record => {
        const populatedStaff = populateStaffQuery === 'true' 
            ? populatedStaffDetailsMap.get(record.staffId.toString()) 
            : null;
        return formatRecordForResponse(record, populatedStaff || undefined);
    });
    
    const monthOrderMap = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        .reduce((acc, m, i) => { acc[m] = i; return acc; }, {} as Record<string, number>);

    formattedRecords.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return (monthOrderMap[a.month] ?? 12) - (monthOrderMap[b.month] ?? 12);
    });

    return NextResponse.json({ success: true, data: formattedRecords });

  } catch (error: any) {
    console.error('Error fetching salary records [GET /api/salary]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch salary records' }, { status: 500 });
  }
}