// app/api/inventory/alerts/route.ts (New file)
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectToDatabase();

    // Find products where current quantity is less than 25% of quantityPerItem
    const lowStockProducts = await Product.aggregate([
      {
        $addFields: {
          stockPercentage: {
            $multiply: [
              { $divide: ["$quantity", "$quantityPerItem"] },
              100
            ]
          }
        }
      },
      {
        $match: {
          stockPercentage: { $lt: 25 } // Less than 25%
        }
      },
      {
        $sort: { stockPercentage: 1 } // Lowest stock first
      }
    ]);

    return NextResponse.json({
      success: true,
      alerts: lowStockProducts.map(product => ({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        currentQuantity: product.quantity,
        quantityPerItem: product.quantityPerItem,
        unit: product.unit,
        stockPercentage: Math.round(product.stockPercentage),
        alertLevel: product.stockPercentage < 10 ? 'critical' : 'low'
      }))
    });

  } catch (error: any) {
    console.error('Low stock alerts error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}