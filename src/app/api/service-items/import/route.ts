// /app/api/services/import/route.ts - FINAL VERSION

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import ServiceCategory from '@/models/ServiceCategory';
import ServiceSubCategory from '@/models/ServiceSubCategory';
import ServiceItem from '@/models/ServiceItem';
import Product from '@/models/Product';

// The Audience column is no longer needed in the Excel file itself
interface ServiceImportRow {
  ServiceName: string;
  ServiceCode: string;
  CategoryName: string;
  SubCategoryName: string;
  Duration: number;
  Price: number;
  MembershipRate?: number;
  [key: string]: any; // Allows for dynamic consumable columns
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.SERVICES_CREATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const audience = searchParams.get('audience');

    // **THE FIX: Validate the audience from the query parameter**
    if (!audience || !['male', 'female', 'Unisex'].includes(audience)) {
        return NextResponse.json({ success: false, message: 'A valid audience (male, female, or Unisex) is required.' }, { status: 400 });
    }

    const rows: ServiceImportRow[] = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'No service data provided.' }, { status: 400 });
    }

    await dbConnect();
    
    const report = {
      totalRows: rows.length,
      successfulImports: 0,
      failedImports: 0,
      newCategories: new Set<string>(),
      newSubCategories: new Set<string>(),
      errors: [] as { row: number; serviceName?: string; message: string }[],
    };

    const productCache = new Map<string, any>();

    for (const [index, row] of rows.entries()) {
      try {
        if (!row.ServiceCode || !row.ServiceName || !row.CategoryName || !row.SubCategoryName) {
            throw new Error('Missing required fields.');
        }

        // **THE FIX: Use the audience from the query parameter to find or create the category**
        const category = await ServiceCategory.findOneAndUpdate(
          { name: row.CategoryName, targetAudience: audience },
          { $setOnInsert: { name: row.CategoryName, targetAudience: audience } },
          { upsert: true, new: true, runValidators: true }
        );
        if (category.isNew) report.newCategories.add(category.name);

        const subCategory = await ServiceSubCategory.findOneAndUpdate(
          { name: row.SubCategoryName, mainCategory: category._id },
          { $setOnInsert: { name: row.SubCategoryName, mainCategory: category._id } },
          { upsert: true, new: true, runValidators: true }
        );
        if (subCategory.isNew) report.newSubCategories.add(subCategory.name);

        const resolvedConsumables = [];
        for (let i = 1; i <= 10; i++) {
          const sku = row[`Consumable${i}_SKU`];
          const defaultQty = row[`Consumable${i}_Default_Qty`];

          if (sku && defaultQty) {
            let product = productCache.get(sku);
            if (!product) {
              product = await Product.findOne({ sku: String(sku).trim().toUpperCase() }).lean();
              if (!product) throw new Error(`Product with SKU "${sku}" not found.`);
              productCache.set(sku, product);
            }
            resolvedConsumables.push({
              product: product._id,
              unit: row[`Consumable${i}_Unit`] || product.unit,
              quantity: {
                default: Number(defaultQty),
                male: Number(row[`Consumable${i}_Male_Qty`]) || undefined,
                female: Number(row[`Consumable${i}_Female_Qty`]) || undefined,
              },
            });
          }
        }

        
        
        const serviceData = {
          name: row.ServiceName,
          serviceCode: row.ServiceCode,
          subCategory: subCategory._id,
          duration: row.Duration,
          price: row.Price,
          membershipRate: row.MembershipRate,
          consumables: resolvedConsumables,
        };


        

        await ServiceItem.findOneAndUpdate(
          { serviceCode: row.ServiceCode },
          { $set: serviceData },
          { upsert: true, new: true, runValidators: true }
        );

        report.successfulImports++;
      } catch (error: any) {
        report.failedImports++;
        report.errors.push({ row: index + 2, serviceName: row.ServiceName, message: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Service import process completed.',
      report: { ...report, newCategories: Array.from(report.newCategories), newSubCategories: Array.from(report.newSubCategories) },
    });

  } catch (error: any) {
    console.error("API Error during service import:", error);
    return NextResponse.json({ success: false, message: 'Server-side error during import.' }, { status: 500 });
  }
}