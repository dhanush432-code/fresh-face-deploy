// src/app/api/attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Attendance, { IAttendance } from '../../../models/Attendance';
import Staff, { IStaff } from '../../../models/staff';
import TemporaryExit, { ITemporaryExit } from '../../../models/TemporaryExit';
import mongoose, { Types } from 'mongoose';
import { differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
// NEW: Import permission tools
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// NEW: A reusable function to check permissions, same as before
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


// --- GET Handler ---
export async function GET(request: NextRequest) {
  // NEW: Protect GET actions with READ permission
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_ATTENDANCE_READ);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    await dbConnect();
    
    // ... rest of GET handler is unchanged ...
    if (action === 'getToday') {
      const todayDate = new Date();
      const todayStartBoundary = startOfDay(todayDate);
      const todayEndBoundary = endOfDay(todayDate);
      const records = await Attendance.find({
        date: { $gte: todayStartBoundary, $lte: todayEndBoundary },
      })
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position' | 'staffIdNumber'> | null }>({ path: 'staffId', model: Staff, select: 'name image position staffIdNumber' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .sort({ checkIn: 'asc' })
        .lean();
      const validRecords = records.filter(record => record.staffId);
      return NextResponse.json({ success: true, data: validRecords });
    } 
    else if (action === 'getMonthly') {
      const yearStr = searchParams.get('year');
      const monthStr = searchParams.get('month');
      if (!yearStr || !monthStr) {
        return NextResponse.json({ success: false, error: 'Year and month parameters are required for monthly view' }, { status: 400 });
      }
      const parsedYear = parseInt(yearStr);
      const parsedMonth = parseInt(monthStr);
      if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return NextResponse.json({ success: false, error: 'Invalid year or month parameters' }, { status: 400 });
      }
      const localMonthDate = new Date(parsedYear, parsedMonth - 1, 1);
      const startDate = startOfMonth(localMonthDate);
      const endDate = endOfMonth(localMonthDate);
      const records = await Attendance.find({ date: { $gte: startDate, $lte: endDate } })
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position' | 'staffIdNumber'> | null }>({ path: 'staffId', model: Staff, select: 'name image position staffIdNumber' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .sort({ date: 'asc', checkIn: 'asc' })
        .lean();
      const validRecords = records.filter(record => record.staffId);
      return NextResponse.json({ success: true, data: validRecords });
    }
    return NextResponse.json({ success: false, error: 'Invalid or missing GET action specified' }, { status: 400 });

  } catch (error: any) {
    console.error(`API GET /api/attendance (action: ${action}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
  // NEW: Protect all POST actions with MANAGE permission
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_ATTENDANCE_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    await dbConnect();
    
    // ... rest of POST handler is unchanged ...
    if (action === 'checkIn') {
        const body = await request.json();
        const { staffId, requiredHours } = body;
        if (!staffId || !isValidObjectId(staffId)) {
            return NextResponse.json({ success: false, error: 'Invalid or missing staff ID' }, { status: 400 });
        }
        if (typeof requiredHours !== 'number' || requiredHours <= 0) {
            return NextResponse.json({ success: false, error: 'Invalid or missing requiredHours' }, { status: 400 });
        }
        const todayStartBoundary = startOfDay(new Date());
        const todayEndBoundary = endOfDay(new Date());
        const existingRecord = await Attendance.findOne({
            staffId: new Types.ObjectId(staffId),
            date: { $gte: todayStartBoundary, $lte: todayEndBoundary },
        });
        if (existingRecord) {
            if (existingRecord.checkIn) {
                return NextResponse.json({ success: false, error: 'Attendance already recorded and checked-in for today' }, { status: 400 });
            }
            existingRecord.checkIn = new Date();
            existingRecord.status = 'incomplete';
            existingRecord.requiredMinutes = requiredHours * 60;
            const updatedRecord = await existingRecord.save();
            const populatedUpdatedRecord = await Attendance.findById(updatedRecord._id).populate('staffId', 'name image position staffIdNumber').populate('temporaryExits').lean();
            return NextResponse.json({ success: true, data: populatedUpdatedRecord });
        }
        const now = new Date();
        const newAttendance = new Attendance({
            staffId: new Types.ObjectId(staffId),
            date: now,
            checkIn: now,
            status: 'incomplete', 
            requiredMinutes: requiredHours * 60,
        });
        const savedRecord = await newAttendance.save();
        const populatedRecord = await Attendance.findById(savedRecord._id).populate('staffId', 'name image position staffIdNumber').populate('temporaryExits').lean();
        return NextResponse.json({ success: true, data: populatedRecord }, { status: 201 });
    } 
    else if (action === 'checkOut') {
      const attendanceIdParam = searchParams.get('attendanceId');
      if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) { return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for checkOut' }, { status: 400 }); }
      const attendance = await Attendance.findById(attendanceIdParam).populate('temporaryExits');
      if (!attendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
      if (attendance.checkOut) return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
      if (!attendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot check-out without a check-in record' }, { status: 400 });
      const standardWorkMinutes = attendance.requiredMinutes || (9 * 60);
      const populatedExits = attendance.temporaryExits as unknown as ITemporaryExit[];
      if (populatedExits.some(exit => !exit.endTime)) { return NextResponse.json({ success: false, error: 'An exit is still ongoing. End it before checking out.' }, { status: 400 }); }
      const checkOutTime = new Date();
      const totalMinutes = differenceInMinutes(checkOutTime, attendance.checkIn);
      const temporaryExitMinutes = populatedExits.reduce((total, exit) => total + (exit.durationMinutes || 0), 0);
      const finalWorkingMinutes = Math.max(0, totalMinutes - temporaryExitMinutes);
      const overtimeMinutes = Math.max(0, finalWorkingMinutes - standardWorkMinutes);
      attendance.checkOut = checkOutTime;
      attendance.totalWorkingMinutes = finalWorkingMinutes;
      attendance.requiredMinutes = standardWorkMinutes;
      attendance.isWorkComplete = finalWorkingMinutes >= standardWorkMinutes;
      attendance.status = attendance.isWorkComplete ? 'present' : 'incomplete';
      attendance.overtimeHours = overtimeMinutes / 60;
      await attendance.save();
      const populatedResponseRecord = await Attendance.findById(attendance._id).populate('staffId', 'name image position staffIdNumber').populate('temporaryExits').lean();
      return NextResponse.json({ success: true, data: populatedResponseRecord });
    }
    else if (action === 'startTempExit') {
        const body = await request.json();
        const attendanceIdParam = searchParams.get('attendanceId');
        if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) { return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for startTempExit' }, { status: 400 }); }
        const { reason } = body; 
        if (!reason || typeof reason !== 'string' || reason.trim() === '') { return NextResponse.json({ success: false, error: 'A valid reason is required.' }, { status: 400 }); }
        const currentAttendance = await Attendance.findById(attendanceIdParam).populate('temporaryExits');
        if (!currentAttendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
        if (currentAttendance.checkOut) return NextResponse.json({ success: false, error: 'Cannot start temp exit after check-out' }, { status: 400 });
        if (!currentAttendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot start temp exit before check-in' }, { status: 400 });
        if ((currentAttendance.temporaryExits as unknown as ITemporaryExit[]).some(exit => !exit.endTime)) { return NextResponse.json({ success: false, error: 'An exit is already ongoing.' }, { status: 400 }); }
        const newTempExit = new TemporaryExit({ attendanceId: currentAttendance._id, startTime: new Date(), reason: reason.trim(), });
        const savedTempExit = await newTempExit.save();
        await Attendance.updateOne({ _id: currentAttendance._id }, { $push: { temporaryExits: savedTempExit._id }});
        return NextResponse.json({ success: true, data: savedTempExit.toObject() });
    }
    else if (action === 'weekOff') {
      const { staffIds, date: dateString } = await request.json();
      if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
        return NextResponse.json({ success: false, error: "staffIds must be a non-empty array." }, { status: 400 });
      }
      const date = parseISO(dateString);
      if (!dateString || !isValid(date)) {
        return NextResponse.json({ success: false, error: "A valid date string (YYYY-MM-DD) is required." }, { status: 400 });
      }
      const targetDateStart = startOfDay(date);
      const targetDateEnd = endOfDay(date);
      const bulkOps = staffIds.map(staffId => ({
        updateOne: {
          filter: {
            staffId: new Types.ObjectId(staffId),
            date: { $gte: targetDateStart, $lte: targetDateEnd }
          },
          update: {
            $set: {
              status: 'week_off',
              isWorkComplete: true,
              totalWorkingMinutes: 0,
              requiredMinutes: 0,
              checkIn: null,
              checkOut: null,
              temporaryExits: [],
              notes: "Manually applied week off."
            },
            $setOnInsert: {
              staffId: new Types.ObjectId(staffId),
              date: targetDateStart
            }
          },
          upsert: true,
        },
      }));
      if (bulkOps.length > 0) {
        await Attendance.bulkWrite(bulkOps);
      }
      const updatedRecords = await Attendance.find({
        staffId: { $in: staffIds.map(id => new Types.ObjectId(id)) },
        date: { $gte: targetDateStart, $lte: targetDateEnd },
      }).populate('staffId', 'name image position staffIdNumber').populate('temporaryExits').lean();
      return NextResponse.json({ success: true, data: updatedRecords });
    }
    return NextResponse.json({ success: false, error: 'Invalid action for POST request' }, { status: 400 });

  } catch (error: any) {
    console.error(`API POST /api/attendance (action: ${action}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
   }
}

// --- PUT Handler ---
export async function PUT(request: NextRequest) {
    // NEW: Protect all PUT actions with MANAGE permission
    const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_ATTENDANCE_MANAGE);
    if (permissionCheck) {
      return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const tempExitId = searchParams.get('tempExitId');

    // ... rest of PUT handler is unchanged ...
    if (action === 'endTempExit') {
        if (!tempExitId || !isValidObjectId(tempExitId)) { return NextResponse.json({ success: false, error: "Valid tempExitId is required" }, { status: 400 }); }
        try {
            await dbConnect();
            const existingExit = await TemporaryExit.findById(tempExitId);
            if (!existingExit) return NextResponse.json({ success: false, error: "Temporary exit not found"}, { status: 404 });
            if (existingExit.endTime) return NextResponse.json({ success: false, error: "Temporary exit already ended"}, { status: 400 });
            const endTime = new Date();
            const duration = differenceInMinutes(endTime, existingExit.startTime);
            existingExit.endTime = endTime;
            existingExit.durationMinutes = Math.max(0, duration); 
            const updatedExit = await existingExit.save();
            return NextResponse.json({ success: true, data: updatedExit.toObject() });
        } catch (error: any) {
            console.error(`API PUT /api/attendance (action: ${action}, tempExitId: ${tempExitId}) Error:`, error);
            if (error.name === 'ValidationError') return NextResponse.json({ success: false, error: error.message }, { status: 400 });
            return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
        }
    }
    return NextResponse.json({ success: false, error: "Invalid action for PUT request" }, { status: 400 });
}

// --- DELETE Handler ---
export async function DELETE(request: NextRequest) {
  // NEW: Protect DELETE action with MANAGE permission
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_ATTENDANCE_MANAGE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  const { searchParams } = request.nextUrl;
  const attendanceId = searchParams.get('id');

  try {
    await dbConnect();
    
    // ... rest of DELETE handler is unchanged ...
    if (!attendanceId || !isValidObjectId(attendanceId)) {
      return NextResponse.json({ success: false, error: "A valid 'id' query parameter is required." }, { status: 400 });
    }
    const deletedRecord = await Attendance.findByIdAndDelete(attendanceId);
    if (!deletedRecord) {
      return NextResponse.json({ success: false, error: "Attendance record not found to delete." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Attendance record deleted successfully." });

  } catch (error: any) {
    console.error(`API DELETE /api/attendance (id: ${attendanceId}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}