// app/api/billing/inventory-preview/route.ts (New file)
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { InventoryManager } from '@/lib/inventoryManager';
import Customer from '@/models/customermodel';
import { Gender } from '@/types/gender';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { serviceIds, customerId } = await req.json();

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Service IDs are required' },
        { status: 400 }
      );
    }

    // Get customer gender if available
    let customerGender: Gender = Gender.Other;
    if (customerId) {
      const customer = await Customer.findById(customerId);
      customerGender = customer?.gender || Gender.Other;
    }
    // Calculate inventory impact
    const inventoryImpact = await InventoryManager.calculateMultipleServicesInventoryImpact(
      serviceIds,
      customerGender
    );

    return NextResponse.json({
      success: true,
      data: {
        customerGender,
        inventoryImpact: inventoryImpact.impactSummary,
        totalUpdates: inventoryImpact.totalUpdates
      }
    });

  } catch (error: any) {
    console.error('Inventory preview error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to calculate inventory impact' },
      { status: 500 }
    );
  }
}