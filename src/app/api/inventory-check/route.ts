// src/app/api/inventory-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import InventoryCheck from '@/models/InventoryCheck';
import Product from '@/models/Product';
import Invoice from '@/models/invoice';
import { InventoryManager, InventoryUpdate } from '@/lib/inventoryManager';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// GET handler to fetch inventory check history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !hasPermission(session.user.role.permissions, PERMISSIONS.INVENTORY_CHECKER_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};
    if (productId) {
      query.product = productId;
    }
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const history = await InventoryCheck.find(query)
      .populate('product', 'name sku unit')
      .populate('checkedBy', 'name')
      .sort({ date: -1 });

    return NextResponse.json({ success: true, history });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST handler to create a new inventory check
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !hasPermission(session.user.role.permissions, PERMISSIONS.INVENTORY_CHECKER_CREATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { productId, actualQuantity, notes } = body;

    if (!productId || actualQuantity === undefined) {
      return NextResponse.json({ success: false, message: 'Product ID and actual quantity are required.' }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
    }

    // Find the last check for this product
    const lastCheck = await InventoryCheck.findOne({ product: productId }).sort({ date: -1 });
    const lastCheckDate = lastCheck ? lastCheck.date : product.stockedDate;

    // Find all invoices since the last check
    const invoices = await Invoice.find({
      'lineItems.itemId': productId,
      'createdAt': { $gte: lastCheckDate }
    }).populate({
        path: 'appointmentId',
        select: 'serviceIds',
        populate: {
            path: 'serviceIds',
            model: 'ServiceItem'
        }
    });

    let expectedUsage = 0;
    for (const invoice of invoices) {
        if (invoice.appointmentId && Array.isArray(invoice.appointmentId.serviceIds)) {
            const serviceIds = invoice.appointmentId.serviceIds.map(s => s._id.toString());
            const { totalUpdates } = await InventoryManager.calculateMultipleServicesInventoryImpact(serviceIds);
            const productUpdate = totalUpdates.find(u => u.productId === productId);
            if (productUpdate) {
                expectedUsage += productUpdate.quantityToDeduct;
            }
        }
    }

    const discrepancy = actualQuantity - (product.totalQuantity - expectedUsage);

    const newCheck = await InventoryCheck.create({
      product: productId,
      checkedBy: session.user.id,
      date: new Date(),
      expectedQuantity: product.totalQuantity - expectedUsage,
      actualQuantity,
      discrepancy,
      notes,
    });

    // Optionally, update the product's quantity to the actual checked quantity
    product.totalQuantity = actualQuantity;
    await product.save();

    return NextResponse.json({ success: true, check: newCheck }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}