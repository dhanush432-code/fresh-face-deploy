// app/api/customer/check-barcode/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get('barcode');
    
    if (!barcode) {
      return NextResponse.json({
        success: false,
        message: 'Barcode is required'
      }, { status: 400 });
    }
    
    const exists = await Customer.checkBarcodeExists(barcode);
    
    return NextResponse.json({
      success: true,
      exists: exists
    });
    
  } catch (error) {
    console.error('Error checking barcode:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check barcode availability'
    }, { status: 500 });
  }
}