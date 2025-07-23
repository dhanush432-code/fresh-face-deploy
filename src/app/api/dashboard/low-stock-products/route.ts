// FILE: src/app/api/dashboard/low-stock-products/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Setting from '@/models/Setting';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

/**
 * GET handler to fetch all products that are currently low on stock.
 * This is used by the dashboard to display the low stock stat card.
 */
export async function GET(request: Request) {
  // Security Check: Ensure the user has permission to view dashboard stats.
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.DASHBOARD_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    // 1. Fetch the global threshold setting
    const thresholdSetting = await Setting.findOne({ key: 'globalLowStockThreshold' }).lean();
    const globalThreshold = thresholdSetting ? parseInt(thresholdSetting.value, 10) : 10;
    if (isNaN(globalThreshold)) {
      throw new Error('Global low stock threshold setting is not a valid number.');
    }

    // 2. Find all products that are at or below the threshold
    // We only select the 'name' and 'numberOfItems' fields to keep the response small and fast.
    const lowStockProducts = await Product.find({
      numberOfItems: { $lte: globalThreshold } 
    })
    .select('name numberOfItems sku') // Select only the necessary fields
    .sort({ numberOfItems: 1 }) // Optional: show the lowest stock items first
    .lean();

    // 3. Return the data in a structured format
    return NextResponse.json({ 
      success: true, 
      count: lowStockProducts.length,
      products: lowStockProducts,
      threshold: globalThreshold,
    });

  } catch (error: any) {
    console.error('[API /dashboard/low-stock-products] Error:', error);
    return NextResponse.json({ success: false, message: 'Server error.', error: error.message }, { status: 500 });
  }
}