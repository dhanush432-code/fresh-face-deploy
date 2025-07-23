// app/api/admin/roles/[roleId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Role from '@/models/role';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function PATCH(
  request: Request,
  { params }: { params: { roleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.ROLES_UPDATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { roleId } = params;
    const updateData = await request.json();

    await connectToDatabase();

    // Find the role
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    // Prevent editing system roles
    if (role.isSystemRole) {
      return NextResponse.json({ 
        success: false, 
        message: 'System roles cannot be modified' 
      }, { status: 403 });
    }

    // Prepare update object
    const updates: any = {};

    if (updateData.displayName) updates.displayName = updateData.displayName;
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.permissions) updates.permissions = updateData.permissions;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    // Update the role
    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { ...updates, updatedBy: session.user.id },
      { new: true }
    );

    return NextResponse.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}