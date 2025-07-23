import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
// IMPORTANT: Import your newly named ProductSubCategory model
import ProductSubCategory from '@/models/ProductSubCategory'; 

/**
 * Handles GET requests to fetch a list of product sub-categories.
 * It filters the list by the parent 'brandId'.
 */
export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const brandId = req.nextUrl.searchParams.get('brandId');
    const type = req.nextUrl.searchParams.get('type'); // For your Retail/In-House filter

    if (!brandId) {
      return NextResponse.json({ success: false, error: 'Brand ID is required.' }, { status: 400 });
    }

    // Build the query object to find the correct sub-categories
    let query: any = { brand: brandId };
    if (type) {
      // Assuming your ProductSubCategory model has a 'type' field that links to the brand's type
      query.type = type;
    }

    const subCategories = await ProductSubCategory.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, data: subCategories });
    
  } catch (error) {
    console.error("API Error fetching product sub-categories:", error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new product sub-category.
 * The request body must contain the 'name' and the parent 'brand' ID.
 */
export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    if (!body.brand) {
        return NextResponse.json({ success: false, error: 'Parent brand ID is required to create a sub-category.' }, { status: 400 });
    }
    const subCategory = await ProductSubCategory.create(body);
    return NextResponse.json({ success: true, data: subCategory }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}