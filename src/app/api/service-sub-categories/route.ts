import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceSubCategory from '@/models/ServiceSubCategory';

// GET all sub-categories, filtered by mainCategory ID
export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const mainCategoryId = req.nextUrl.searchParams.get('mainCategoryId');
    if (!mainCategoryId) {
      return NextResponse.json({ success: false, error: 'Main Category ID is required.' }, { status: 400 });
    }
    const subCategories = await ServiceSubCategory.find({ mainCategory: mainCategoryId }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: subCategories });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

// POST a new sub-category
export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    if (!body.mainCategory) {
        return NextResponse.json({ success: false, error: 'Parent category ID is required.' }, { status: 400 });
    }
    const subCategory = await ServiceSubCategory.create(body);
    return NextResponse.json({ success: true, data: subCategory }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}