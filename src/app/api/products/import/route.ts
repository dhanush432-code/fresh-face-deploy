// /app/api/products/import/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import ProductBrand from '@/models/ProductBrand';
import ProductSubCategory from '@/models/ProductSubCategory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Define the expected structure of a row from the Excel file
interface ProductImportRow {
  BrandName: string;
  SubCategoryName: string;
  ProductName: string;
  SKU: string;
  ProductType: 'Retail' | 'In-House';
  Price: number;
  NumberOfItems: number;
  QuantityPerItem: number;
  Unit: 'ml' | 'g' | 'kg' | 'l' | 'piece';
  StockedDate: string; // Will be a string like 'YYYY-MM-DD'
  ExpiryDate?: string;
  LowStockThreshold?: number;
}

export async function POST(req: NextRequest) {
  // 1. --- PERMISSION CHECK ---
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.PRODUCTS_CREATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const productsToImport: ProductImportRow[] = await req.json();
    if (!Array.isArray(productsToImport) || productsToImport.length === 0) {
      return NextResponse.json({ success: false, message: 'No products to import.' }, { status: 400 });
    }

    await dbConnect();
    
    // 2. --- REPORTING & CACHING ---
    const report = {
      totalRows: productsToImport.length,
      successfulImports: 0,
      failedImports: 0,
      newBrands: new Set<string>(),
      newSubCategories: new Set<string>(),
      errors: [] as { row: number; message: string; data: ProductImportRow }[],
    };

    const brandCache = new Map<string, any>();
    const subCategoryCache = new Map<string, any>();

    // 3. --- PROCESS EACH ROW ---
    for (const [index, row] of productsToImport.entries()) {
      try {
        // Basic validation for the current row
        if (!row.BrandName || !row.SubCategoryName || !row.ProductName || !row.SKU || !row.ProductType) {
          throw new Error('Missing required fields: BrandName, SubCategoryName, ProductName, SKU, and ProductType are all required.');
        }

        // --- Find or Create Brand ---
        const brandCacheKey = `${row.BrandName}-${row.ProductType}`;
        if (!brandCache.has(brandCacheKey)) {
          const brand = await ProductBrand.findOneAndUpdate(
            { name: row.BrandName, type: row.ProductType },
            { $setOnInsert: { name: row.BrandName, type: row.ProductType } },
            { upsert: true, new: true, runValidators: true }
          );
          brandCache.set(brandCacheKey, brand);
          if (brand.isNew) report.newBrands.add(brand.name);
        }
        const brand = brandCache.get(brandCacheKey);

        // --- Find or Create SubCategory ---
        const subCategoryCacheKey = `${row.SubCategoryName}-${brand._id}`;
        if (!subCategoryCache.has(subCategoryCacheKey)) {
          const subCategory = await ProductSubCategory.findOneAndUpdate(
            { name: row.SubCategoryName, brand: brand._id },
            { $setOnInsert: { name: row.SubCategoryName, brand: brand._id, type: brand.type } },
            { upsert: true, new: true, runValidators: true }
          );
          subCategoryCache.set(subCategoryCacheKey, subCategory);
          if (subCategory.isNew) report.newSubCategories.add(subCategory.name);
        }
        const subCategory = subCategoryCache.get(subCategoryCacheKey);
        
        // --- Create or Update Product ---
        const productData = {
            name: row.ProductName,
            brand: brand._id,
            subCategory: subCategory._id,
            type: brand.type,
            price: row.Price,
            numberOfItems: row.NumberOfItems,
            quantityPerItem: row.QuantityPerItem,
            unit: row.Unit,
            stockedDate: new Date(row.StockedDate),
            expiryDate: row.ExpiryDate ? new Date(row.ExpiryDate) : null,
            lowStockThreshold: row.LowStockThreshold || 10,
            totalQuantity: row.NumberOfItems * row.QuantityPerItem
        };
        
        await Product.findOneAndUpdate(
            { sku: row.SKU },
            { $set: productData },
            { upsert: true, new: true, runValidators: true }
        );

        report.successfulImports++;

      } catch (error: any) {
        report.failedImports++;
        report.errors.push({
          row: index + 2, // Excel rows are 1-based, plus header
          message: error.message || 'An unknown error occurred.',
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Import process completed.',
      report: {
          ...report,
          newBrands: Array.from(report.newBrands),
          newSubCategories: Array.from(report.newSubCategories)
      }
    });

  } catch (error: any) {
    console.error("API Error during product import:", error);
    return NextResponse.json({ success: false, message: 'Failed to process import request.' }, { status: 500 });
  }
}