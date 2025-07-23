// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  await dbConnect();
  const sku = req.nextUrl.searchParams.get('sku');
  const search = req.nextUrl.searchParams.get('search');
  const subCategoryId = req.nextUrl.searchParams.get('subCategoryId');

  try {
    const query: any = {};

    if (subCategoryId) {
      query.subCategory = new mongoose.Types.ObjectId(subCategoryId);
    }
    if (sku) {
      query.sku = { $regex: `^${sku}$`, $options: 'i' };
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // If no valid filter is provided, the query remains empty,
    // and all products will be fetched.

    const products = await Product.find(query)
      .populate('brand', 'name type')
      .populate('subCategory', 'name')
      .sort({ name: 1 });
    return NextResponse.json({ success: true, data: products });

  } catch (error) {
    console.error("API Error fetching products:", error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const product = await Product.create(body);

    console.log("API PRODUCT CREATION:", product);
    
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error("API PRODUCT CREATION ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create product' }, { status: 400 });
  }
}