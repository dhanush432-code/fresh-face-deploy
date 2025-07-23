import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
// Import the models needed for this route
import ProductSubCategory from '@/models/ProductSubCategory';
import Product from '@/models/Product'; // For the safety check

interface IParams { params: { id: string } }

/**
 * Handles PUT requests to update a single product sub-category.
 */
export async function PUT(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    const body = await req.json();
    const subCategory = await ProductSubCategory.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    
    if (!subCategory) {
      return NextResponse.json({ success: false, error: 'Product Sub-Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: subCategory });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * Handles DELETE requests for a single product sub-category.
 * Includes a safety check to prevent deletion if products are using it.
 */
export async function DELETE(req: NextRequest, { params }: IParams) {
  await dbConnect();
  try {
    // Safety Check: Before deleting, see if any products belong to this sub-category.
    const productCount = await Product.countDocuments({ subCategory: params.id });
    if (productCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete. This sub-category is used by ${productCount} product(s).` },
        { status: 400 }
      );
    }

    const deletedSubCategory = await ProductSubCategory.findByIdAndDelete(params.id);
    
    if (!deletedSubCategory) {
      return NextResponse.json({ success: false, error: 'Product Sub-Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}