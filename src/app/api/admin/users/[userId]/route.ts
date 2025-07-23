// app/api/admin/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';
import Role from '@/models/role';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.USERS_UPDATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const updateData = await request.json();

    await connectToDatabase();

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Prepare update object
    const updates: any = {};

    if (updateData.name) updates.name = updateData.name;
    if (updateData.email) updates.email = updateData.email.toLowerCase();
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    // Handle role change
    if (updateData.roleId && updateData.roleId !== user.roleId.toString()) {
      const role = await Role.findById(updateData.roleId);
      if (!role) {
        return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
      }
      updates.roleId = updateData.roleId;
    }

    // Handle password change
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updates.password = hashedPassword;
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...updates, updatedBy: session.user.id },
      { new: true }
    )
    .populate({
      path: 'roleId',
      select: 'name displayName'
    })
    .select('-password');

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}