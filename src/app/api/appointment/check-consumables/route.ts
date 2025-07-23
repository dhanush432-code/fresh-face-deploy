// FILE: src/api/appointment/check-consumables/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceItem from '@/models/ServiceItem';
import Product from '@/models/Product';
import { Gender } from '@/types/gender';

interface CheckRequestBody {
  serviceIds: string[];
  customerGender?: 'male' | 'female' | 'other';
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { serviceIds, customerGender = 'other' }: CheckRequestBody = await req.json();

    if (!serviceIds || serviceIds.length === 0) {
      return NextResponse.json({ success: true, canBook: true });
    }

    const requiredConsumables = new Map<string, { required: number, unit: string, name: string }>();
    const services = await ServiceItem.find({ _id: { $in: serviceIds } }).populate('consumables.product', 'name');

    for (const service of services) {
      if (!service.consumables || service.consumables.length === 0) continue;

      for (const consumable of service.consumables) {
        if (!consumable.product?._id) continue;
        
        let quantityToUse = consumable.quantity.default || 0;
        if (customerGender === Gender.Male && typeof consumable.quantity.male === 'number') {
          quantityToUse = consumable.quantity.male;
        } else if (customerGender === Gender.Female && typeof consumable.quantity.female === 'number') {
          quantityToUse = consumable.quantity.female;
        }
        
        const productId = consumable.product._id.toString();
        const existing = requiredConsumables.get(productId);

        if (existing) {
          existing.required += quantityToUse;
        } else {
          requiredConsumables.set(productId, {
            required: quantityToUse,
            unit: consumable.unit,
            name: (consumable.product as any).name,
          });
        }
      }
    }

    if (requiredConsumables.size === 0) {
      return NextResponse.json({ success: true, canBook: true });
    }

    const productIds = Array.from(requiredConsumables.keys());
    const productsInDb = await Product.find({ _id: { $in: productIds } }).select('totalQuantity name');
    
    const issues: any[] = [];
    for (const dbProduct of productsInDb) {
      const required = requiredConsumables.get(dbProduct._id.toString());
      if (!required) continue;

      if (dbProduct.totalQuantity < required.required) {
        issues.push({
          productName: required.name,
          required: required.required,
          available: dbProduct.totalQuantity,
          unit: required.unit,
        });
      }
    }

    if (issues.length > 0) {
      return NextResponse.json({ success: true, canBook: false, issues });
    }

    return NextResponse.json({ success: true, canBook: true });

  } catch (error: any) {
    console.error("Error checking consumables:", error);
    return NextResponse.json({ success: false, message: "Error checking consumable availability." }, { status: 500 });
  }
}