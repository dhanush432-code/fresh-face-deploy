// FILE: src/app/api/inventory-check/export/route.ts (Corrected)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import InventoryCheck from '@/models/InventoryCheck';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import ExcelJS from 'exceljs';
import { IProduct } from '@/models/Product';
import { IUser } from '@/models/user';

// Import models to ensure they are registered for this specific API call.
import '@/models/Product';
import '@/models/user';
import '@/models/ProductBrand';
import '@/models/ProductSubCategory';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !hasPermission(session.user.role.permissions, PERMISSIONS.INVENTORY_CHECKER_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const history = await InventoryCheck.find({})
      .populate({
          path: 'product',
          populate: [ { path: 'brand' }, { path: 'subCategory' } ]
      })
      .populate('checkedBy')
      .sort({ date: -1 });
      
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Check Report');

    worksheet.columns = [
        { header: 'Date', key: 'date', width: 15, style: { numFmt: 'dd-mm-yyyy' } },
        { header: 'Product Name', key: 'productName', width: 35 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Expected Qty', key: 'expected', width: 15, style: { numFmt: '#,##0.00' } },
        { header: 'Actual Qty', key: 'actual', width: 15, style: { numFmt: '#,##0.00' } },
        { header: 'Discrepancy', key: 'discrepancy', width: 15, style: { numFmt: '#,##0.00' } },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Checked By', key: 'checkedBy', width: 20 },
        { header: 'Notes', key: 'notes', width: 40 },
    ];
    
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };

    // NOTE: This filter is a temporary fix. It removes any rows from the report where the product has been deleted.
    // The long-term snapshot solution would preserve these rows and show "N/A".
    const validHistory = history.filter(check => check.product);

    validHistory.forEach(check => {
        const product = check.product as IProduct;
        const user = check.checkedBy as IUser;
        worksheet.addRow({
          date: new Date(check.date),
          productName: product.name,
          sku: product.sku,
          brand: (product.brand as any)?.name || 'N/A',
          category: (product.subCategory as any)?.name || 'N/A',
          expected: check.expectedQuantity,
          actual: check.actualQuantity,
          discrepancy: check.discrepancy,
          unit: product.unit,
          checkedBy: user?.name || '[User Deleted]',
          notes: check.notes || '',
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // --- FIX ---
    // The string value must be wrapped in backticks (`) to create a template literal.
    headers.set('Content-Disposition', `attachment; filename="InventoryCheckReport-${timestamp}.xlsx"`);

    return new NextResponse(buffer, { status: 200, headers });

  } catch (error: any) {
    console.error("Failed to generate Excel report:", error);
    return NextResponse.json({ success: false, message: `An internal server error occurred: ${error.message}` }, { status: 500 });
  }
}