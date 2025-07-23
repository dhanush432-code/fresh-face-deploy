import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const body = await req.json();

    // STEP 1: Find the full document from the database first.
    const product = await Product.findById(params.id);

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // STEP 2: Apply the changes from your form to the document in memory.
    // 'Object.assign' is a safe way to merge the new data.
    Object.assign(product, body);

    // STEP 3: Save the document. This is the crucial step that will trigger your pre('save') hook.
    // Your totalQuantity will be automatically calculated here before saving.
    const savedProduct = await product.save();

    // Return the fully updated and saved product.
    return NextResponse.json({ success: true, data: savedProduct });

  } catch (error: any) {
    // This will catch any validation errors from the .save() call as well.
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const deletedProduct = await Product.findByIdAndDelete(params.id);
    if (!deletedProduct) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}