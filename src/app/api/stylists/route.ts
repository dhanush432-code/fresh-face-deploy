// src/app/api/stylists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Stylist, { IStylist } from '@/models/Stylist';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

async function checkPermission(permission: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, permission)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkPermission(PERMISSIONS.STYLISTS_READ);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  
  await dbConnect();
  try {
    const stylists = await Stylist.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: stylists });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await checkPermission(PERMISSIONS.STYLISTS_CREATE);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  try {
    const body: IStylist = await req.json();
    const stylist = await Stylist.create(body);
    return NextResponse.json({ success: true, data: stylist }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await checkPermission(PERMISSIONS.STYLISTS_UPDATE);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Stylist ID not provided' }, { status: 400 });
  }

  try {
    const body: Partial<IStylist> = await req.json();
    const stylist = await Stylist.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!stylist) {
      return NextResponse.json({ success: false, error: 'Stylist not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: stylist });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await checkPermission(PERMISSIONS.STYLISTS_DELETE);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Stylist ID not provided' }, { status: 400 });
  }

  try {
    const deletedStylist = await Stylist.findByIdAndDelete(id);
    if (!deletedStylist) {
      return NextResponse.json({ success: false, error: 'Stylist not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}