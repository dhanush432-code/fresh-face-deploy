// src/app/api/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Staff, { IStaff } from '../../../models/staff';
import Stylist from '../../../models/Stylist';
import ShopSetting from '../../../models/ShopSetting';
import mongoose, { Types } from 'mongoose';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

// Helper function to validate MongoDB ObjectId string
const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// Define a more specific type for lean results that include _id
type LeanStaffDocument = Omit<IStaff, keyof mongoose.Document<Types.ObjectId>> & { _id: Types.ObjectId };

/**
 * Reads the next available staff ID directly from the settings.
 * This function now returns the number exactly as it is in the settings.
 */
async function getNextStaffId(): Promise<string> {
    await dbConnect();
    const settings = await ShopSetting.findOne({ key: 'defaultSettings' }).lean();
    // The base number is now treated as the NEXT available number.
    const nextNumber = settings?.staffIdBaseNumber || 1;
    return nextNumber.toString();
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

export async function GET(request: NextRequest) {
    
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_LIST_READ);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }
  await dbConnect();
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const staffId = searchParams.get('id');

  try {
    if (action === 'getNextId') {
      const nextId = await getNextStaffId();
      return NextResponse.json({ success: true, data: { nextId } });
    }

    if (action === 'list') {
      const staffList = await Staff.find({})
        .sort({ name: 'asc' })
        .lean<LeanStaffDocument[]>();
      return NextResponse.json({ success: true, data: staffList.map(s => ({...s, id: s._id.toString()})) });
    }

    if (staffId) {
      if (!isValidObjectId(staffId)) {
        return NextResponse.json({ success: false, error: 'Invalid staff ID format' }, { status: 400 });
      }
      const staffMember = await Staff.findById(staffId).lean<LeanStaffDocument>();
      if (!staffMember) {
        return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: {...staffMember, id: staffMember._id.toString()} });
    }
    return NextResponse.json({ success: false, error: 'Invalid action or missing ID for GET request' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to fetch staff: ${message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_LIST_CREATE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  await dbConnect();
  try {
    const body = await request.json();
    const { 
        staffIdNumber, 
        name, email, position, phone, salary, address, image, aadharNumber, joinDate,
        aadharImage, passbookImage, agreementImage 
    } = body;

    if (!staffIdNumber || !name || !phone || !position || !aadharNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Staff ID, Name, phone, position, and Aadhar Number are required' 
      }, { status: 400 });
    }
    
    // Check for duplicates using the ID from the form
    const existingStaff = await Staff.findOne({
        $or: [
            { staffIdNumber: staffIdNumber },
            ...(email ? [{ email }] : []),
            ...(aadharNumber ? [{ aadharNumber }] : [])
        ]
    }).lean();

    if (existingStaff) {
        let errorMessage = 'A user with this data already exists.';
        if (existingStaff.staffIdNumber === staffIdNumber) {
            errorMessage = `Staff ID ${staffIdNumber} already exists. Please try again.`;
        } else if (email && existingStaff.email === email) {
            errorMessage = 'Email already exists.';
        } else if (aadharNumber && existingStaff.aadharNumber === aadharNumber) {
            errorMessage = 'Aadhar number already exists.';
        }
        return NextResponse.json({ success: false, error: errorMessage }, { status: 409 });
    }

    const newStaffDoc = new Staff({
      staffIdNumber: staffIdNumber,
      name, 
      email: email || null,
      position, phone, salary, address, aadharNumber, joinDate,
      image: image || null,
      aadharImage: aadharImage || null,
      passbookImage: passbookImage || null,
      agreementImage: agreementImage || null,
      status: 'active',
    });
    const savedStaff = await newStaffDoc.save();

    // After successfully saving the staff member, increment the setting for the next user.
    await ShopSetting.updateOne(
        { key: 'defaultSettings' },
        { $inc: { staffIdBaseNumber: 1 } },
        { upsert: true }
    );

    if (savedStaff.position.toLowerCase().trim() === 'stylist') {
      const existingStylist = await Stylist.findOne({ staffInfo: savedStaff._id });
      if (!existingStylist) {
        const newStylist = new Stylist({
          staffInfo: savedStaff._id,
          availabilityStatus: 'Available',
        });
        await newStylist.save();
      }
    }

    const staffObject = savedStaff.toObject();
    return NextResponse.json({ success: true, data: {...staffObject, id: savedStaff._id.toString()} }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding staff:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: `Failed to add staff member: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
   
  const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_LIST_UPDATE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  await dbConnect();
  const { searchParams } = request.nextUrl;
  const staffId = searchParams.get('id'); // This is the unique MongoDB _id

  if (!staffId || !isValidObjectId(staffId)) {
    return NextResponse.json({ success: false, error: 'Valid Staff ID is required' }, { status: 400 });
  }

  try {
    const updateData = await request.json(); 

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No update data provided' }, { status: 400 });
    }
    
    const orConditions: any[] = [];
    if (updateData.staffIdNumber) orConditions.push({ staffIdNumber: updateData.staffIdNumber });
    if (updateData.email) orConditions.push({ email: updateData.email });
    if (updateData.aadharNumber) orConditions.push({ aadharNumber: updateData.aadharNumber });

    if (orConditions.length > 0) {
        const existingStaff = await Staff.findOne({
            _id: { $ne: staffId },
            $or: orConditions
        }).lean();

        if (existingStaff) {
            let errorMessage = 'Data is already in use by another staff member.';
            if (updateData.staffIdNumber && existingStaff.staffIdNumber === updateData.staffIdNumber) errorMessage = 'This Staff ID is already in use by another staff member.';
            else if (updateData.email && existingStaff.email === updateData.email) errorMessage = 'This Email is already in use by another staff member.';
            else if (updateData.aadharNumber && existingStaff.aadharNumber === updateData.aadharNumber) errorMessage = 'This Aadhar number is already in use by another staff member.';
            return NextResponse.json({ success: false, error: errorMessage }, { status: 409 });
        }
    }

    const updatedStaff = await Staff.findByIdAndUpdate(staffId, { $set: updateData }, { new: true, runValidators: true }).lean<LeanStaffDocument>();
    if (!updatedStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {...updatedStaff, id: updatedStaff._id.toString()} });
  } catch (error: any) {
    console.error('Error updating staff:', error);
     if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }
    if (error.code === 11000) {
        return NextResponse.json({ success: false, error: 'A user with that email or Aadhar number already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: `Failed to update staff member: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {

    const permissionCheck = await checkPermissions(PERMISSIONS.STAFF_LIST_DELETE);
  if (permissionCheck) {
    return NextResponse.json({ success: false, error: permissionCheck.error }, { status: permissionCheck.status });
  }

  await dbConnect();
  const { searchParams } = request.nextUrl;
  const staffId = searchParams.get('id');

  if (!staffId || !isValidObjectId(staffId)) {
    return NextResponse.json({ success: false, error: 'Valid Staff ID is required' }, { status: 400 });
  }

  try {
    const deactivatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      { status: 'inactive' },
      { new: true }
    ).lean<LeanStaffDocument>();

    if (!deactivatedStaff) {
        return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Staff member deactivated successfully', data: {...deactivatedStaff, id: deactivatedStaff._id.toString()} });
  } catch (error: any) {
    console.error('Error deactivating staff:', error);
    return NextResponse.json({ success: false, error: `Failed to deactivate staff: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}