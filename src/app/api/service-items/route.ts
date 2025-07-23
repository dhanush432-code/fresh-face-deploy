// src/app/api/service-items/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceItem from '@/models/ServiceItem';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const subCategoryId = req.nextUrl.searchParams.get('subCategoryId');
    const gender = req.nextUrl.searchParams.get('gender');
    const search = req.nextUrl.searchParams.get('search');

    const query: any = {};

    if (subCategoryId) {
      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        return NextResponse.json({ success: false, error: 'Invalid Sub-Category ID' }, { status: 400 });
      }
      query.subCategory = new mongoose.Types.ObjectId(subCategoryId);
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let serviceItems = await ServiceItem.find(query)
      .populate({
        path: 'subCategory',
        populate: {
          path: 'mainCategory',
          model: 'ServiceCategory',
          select: 'targetAudience'
        }
      })
      .populate('consumables.product', 'name sku unit')
      .sort({ name: 1 });

    if (gender && (gender === 'male' || gender === 'female')) {
      serviceItems = serviceItems.filter(item => {
        const targetAudience = item.subCategory?.mainCategory?.targetAudience;
        return targetAudience === 'Unisex' || targetAudience?.toLowerCase() === gender;
      });
    }

    const formattedServices = serviceItems.map(item => {
      const serviceObject = item.toObject();
      return {
        ...serviceObject,
        _id: item._id.toString(),
        id: item._id.toString(),
        audience: item.subCategory?.mainCategory?.targetAudience,
      };
    });

    return NextResponse.json({
      success: true,
      services: formattedServices,
      data: formattedServices
    });
  } catch (error: any) {
    console.error('ServiceItem API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Server Error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    
    const serviceItem = await ServiceItem.create(body);
    return NextResponse.json({ success: true, data: serviceItem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}