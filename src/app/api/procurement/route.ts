// app/api/procurement/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Procurement from '@/models/Procurement';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const totalRecords = await Procurement.countDocuments();
    const records = await Procurement.find({})
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({ success: true, records, totalPages });
  } catch (error) {
    console.error('Error fetching procurement records:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_CREATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, quantity, price, date, vendorName, brand, unit, unitPerItem, expiryDate } = data;

    if (!name || !quantity || !price || !date || !vendorName || !brand || !unit || !unitPerItem) {
      return NextResponse.json({ success: false, message: 'All required fields must be provided' }, { status: 400 });
    }

    const totalPrice = quantity * price;

    await connectToDatabase();

    const record = await Procurement.create({
      name,
      quantity,
      price,
      totalPrice,
      date: new Date(date),
      vendorName,
      brand,
      unit,
      unitPerItem,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      createdBy: session.user.name,
    });

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error('Error creating procurement record:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_UPDATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { recordId, name, quantity, price, date, vendorName, brand, unit, unitPerItem, expiryDate } = data;

    if (!recordId || !name || !quantity || !price || !date || !vendorName || !brand || !unit || !unitPerItem) {
      return NextResponse.json({ success: false, message: 'All required fields must be provided' }, { status: 400 });
    }

    const totalPrice = quantity * price;

    await connectToDatabase();

    const record = await Procurement.findById(recordId);
    if (!record) {
      return NextResponse.json({ success: false, message: 'Record not found' }, { status: 404 });
    }

    record.name = name;
    record.quantity = quantity;
    record.price = price;
    record.totalPrice = totalPrice;
    record.date = new Date(date);
    record.vendorName = vendorName;
    record.brand = brand;
    record.unit = unit;
    record.unitPerItem = unitPerItem;
    record.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    record.updatedBy = session.user.name;
    record.updatedAt = new Date();

    await record.save();

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error updating procurement record:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_DELETE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json({ success: false, message: 'Record ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const record = await Procurement.findByIdAndDelete(recordId);
    if (!record) {
      return NextResponse.json({ success: false, message: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting procurement record:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}