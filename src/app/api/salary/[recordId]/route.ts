// app/api/salary/[recordId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb'; // CORRECTED PATH: Adjust if 'lib' is not 3 levels up from 'app/api/salary'
import SalaryRecord, { ISalaryRecord } from '../../../../models/SalaryRecord'; // CORRECTED PATH
import Staff, { IStaff } from '../../../../models/staff'; // CORRECTED PATH
import mongoose from 'mongoose';

// --- Interfaces for Payloads and Responses ---
interface MarkAsPaidPayloadFE {
  isPaid: boolean; 
  paidDate: string; // Expected as YYYY-MM-DD string
}

interface PopulatedStaffDetailsFE {
  id: string;
  name: string;
  image?: string | null;
  position: string;
}

interface SalaryRecordResponseFE {
  id: string;
  staffId: string | PopulatedStaffDetailsFE;
  month: string;
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null; // YYYY-MM-DD string or null
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

// --- Helper Function to Format Response ---
function formatRecordForResponse(
    record: ISalaryRecord | (Omit<ISalaryRecord, 'staffId'> & { staffId: IStaff | mongoose.Types.ObjectId | string, _id: mongoose.Types.ObjectId, createdAt?: Date, updatedAt?: Date}),
    populatedStaffParam?: IStaff | null
): SalaryRecordResponseFE {
    let staffDetailsFE: string | PopulatedStaffDetailsFE;
    const staffDataToUse = populatedStaffParam || 
        (record.staffId && typeof record.staffId === 'object' && '_id' in record.staffId ? record.staffId as IStaff : null);

    if (staffDataToUse) {
        staffDetailsFE = {
            id: staffDataToUse._id.toString(),
            name: staffDataToUse.name,
            image: staffDataToUse.image || null,
            position: staffDataToUse.position,
        };
    } else if (record.staffId) {
        staffDetailsFE = record.staffId.toString();
    } else {
        staffDetailsFE = "Unknown Staff"; // Fallback
    }
    
    const recordIdStr = (record._id || (record as any).id)?.toString();
    if (!recordIdStr) {
        console.error("Record is missing _id in formatRecordForResponse:", record);
        throw new Error("Record ID is missing.");
    }

    return {
        id: recordIdStr,
        staffId: staffDetailsFE,
        month: record.month,
        year: record.year,
        baseSalary: record.baseSalary,
        bonus: record.bonus,
        deductions: record.deductions,
        advanceDeducted: record.advanceDeducted,
        netSalary: record.netSalary,
        isPaid: record.isPaid,
        paidDate: record.paidDate ? new Date(record.paidDate).toISOString().split('T')[0] : null,
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : undefined,
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : undefined,
    };
}

// --- PATCH Handler (to mark salary as paid) ---
export async function PATCH(
  req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    await dbConnect();
    const { recordId } = params;

    if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json({ success: false, error: 'Invalid record ID format' }, { status: 400 });
    }

    const payload = (await req.json()) as MarkAsPaidPayloadFE;

    // Validate the payload specifically for marking as paid
    if (typeof payload.isPaid !== 'boolean' || payload.isPaid !== true || !payload.paidDate) {
      return NextResponse.json({ success: false, error: 'Invalid payload: For marking as paid, isPaid must be true and paidDate is required.' }, { status: 400 });
    }
    try {
      new Date(payload.paidDate).toISOString(); // Check if paidDate is a valid date string
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid paidDate format.' }, { status: 400 });
    }

    const updatedSalaryRecordDb = await SalaryRecord.findByIdAndUpdate(
      recordId,
      { 
        isPaid: true, // Hardcode true as this endpoint is for marking as paid
        paidDate: new Date(payload.paidDate) // Convert string to Date
      },
      { new: true, runValidators: true }
    ).lean(); // Use lean for plain JS object

    if (!updatedSalaryRecordDb) {
      return NextResponse.json({ success: false, error: 'Salary record not found' }, { status: 404 });
    }
    
    // Manually populate staff details if needed for the response
    let populatedStaff: IStaff | null = null;
    if (updatedSalaryRecordDb.staffId && mongoose.Types.ObjectId.isValid(updatedSalaryRecordDb.staffId.toString())) {
        populatedStaff = await Staff.findById(updatedSalaryRecordDb.staffId)
                                    .select('name image position') // Select specific fields
                                    .lean();
    }
    
    const responseRecord = formatRecordForResponse(updatedSalaryRecordDb, populatedStaff);

    return NextResponse.json({ success: true, data: responseRecord });

  } catch (error: any) {
    const recordIdFromParams = params?.recordId || 'unknown';
    console.error(`Error updating salary record ${recordIdFromParams} [PATCH /api/salary/[recordId]]:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update salary record' }, { status: 500 });
  }
}

// --- Optional: GET Handler (to fetch a single salary record by ID) ---
export async function GET(
  req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    await dbConnect();
    const { recordId } = params;
     const { searchParams } = new URL(req.url);
    const populateStaffQuery = searchParams.get('populateStaff');


    if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json({ success: false, error: 'Invalid record ID format' }, { status: 400 });
    }

    const salaryRecordDb = await SalaryRecord.findById(recordId).lean();

    if (!salaryRecordDb) {
      return NextResponse.json({ success: false, error: 'Salary record not found' }, { status: 404 });
    }

    let populatedStaff: IStaff | null = null;
    if (populateStaffQuery === 'true' && salaryRecordDb.staffId && mongoose.Types.ObjectId.isValid(salaryRecordDb.staffId.toString())) {
        populatedStaff = await Staff.findById(salaryRecordDb.staffId)
                                    .select('name image position')
                                    .lean();
    }
    
    const responseRecord = formatRecordForResponse(salaryRecordDb, populatedStaff);
    return NextResponse.json({ success: true, data: responseRecord });

  } catch (error: any) {
    const recordIdFromParams = params?.recordId || 'unknown';
    console.error(`Error fetching salary record ${recordIdFromParams} [GET /api/salary/[recordId]]:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch salary record' }, { status: 500 });
  }
}


// --- Optional: DELETE Handler (to delete a salary record by ID) ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    await dbConnect();
    const { recordId } = params;

    if (!recordId || !mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json({ success: false, error: 'Invalid record ID format' }, { status: 400 });
    }

    const deletedRecord = await SalaryRecord.findByIdAndDelete(recordId).lean();

    if (!deletedRecord) {
      return NextResponse.json({ success: false, error: 'Salary record not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Salary record deleted successfully', data: { id: recordId } });

  } catch (error: any) {
    const recordIdFromParams = params?.recordId || 'unknown';
    console.error(`Error deleting salary record ${recordIdFromParams} [DELETE /api/salary/[recordId]]:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete salary record' }, { status: 500 });
  }
}