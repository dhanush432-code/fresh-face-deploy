import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Brand from '@/models/ProductBrand';
import SubCategory from '@/models/ProductSubCategory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

async function checkPermission(permission: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, permission)) {
    return null;
  }
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await checkPermission(PERMISSIONS.PRODUCTS_UPDATE);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
  await dbConnect();
  try {
    const body = await req.json();
    const brand = await Brand.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!brand) return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: brand });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await checkPermission(PERMISSIONS.PRODUCTS_DELETE);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  try {
    const subCategoryCount = await SubCategory.countDocuments({ brand: params.id });
    if (subCategoryCount > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete brand. It has associated sub-categories.' }, { status: 400 });
    }
    const deletedBrand = await Brand.findByIdAndDelete(params.id);
    if (!deletedBrand) return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}