// app/api/admin/roles/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Role from '@/models/role';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import user from '@/models/user';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.ROLES_READ)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const roles = await Role.find({})
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.ROLES_DELETE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json({ success: false, message: 'Role ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    // Delete the associated users
    await user.deleteMany({ roleId: roleId });

    // Delete the role
    await role.deleteOne({ _id: roleId });

    return NextResponse.json({ success: true, message: 'Role and associated users deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.ROLES_CREATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { name, displayName, description, permissions } = await request.json();

    if (!name || !displayName || !permissions) {
      return NextResponse.json({ success: false, message: 'Name, display name, and permissions are required' }, { status: 400 });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toUpperCase() });
    if (existingRole) {
      return NextResponse.json({ success: false, message: 'Role with this name already exists' }, { status: 409 });
    }

    const role = await Role.create({
      name: name.toUpperCase(),
      displayName,
      description,
      permissions,
      createdBy: session.user.id
    });

    return NextResponse.json({ success: true, role }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}