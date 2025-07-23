import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceSubCategory from '@/models/ServiceSubCategory';
import ServiceItem from '@/models/ServiceItem';

interface IParams { params: { id: string } }

// PUT (update) a sub-category
export async function PUT(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    const body = await req.json();
    const subCategory = await ServiceSubCategory.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!subCategory) return NextResponse.json({ success: false, error: 'Sub-Category not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: subCategory });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE a sub-category
export async function DELETE(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    const serviceCount = await ServiceItem.countDocuments({ subCategory: params.id });
    if (serviceCount > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete. Used by ${serviceCount} service(s).` }, { status: 400 });
    }
    const deletedSubCategory = await ServiceSubCategory.findByIdAndDelete(params.id);
    if (!deletedSubCategory) return NextResponse.json({ success: false, error: 'Sub-Category not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}