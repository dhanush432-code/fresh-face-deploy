import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceItem from '@/models/ServiceItem';

interface IParams { params: { id: string } }

// PUT (update) a service item
export async function PUT(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    const body = await req.json();
    const service = await ServiceItem.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!service) return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE a service item (no safety check needed as it's the final item in the chain)
export async function DELETE(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    const deletedService = await ServiceItem.findByIdAndDelete(params.id);
    if (!deletedService) return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}