// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';
import Role from '@/models/role';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Get default role (you might want to create a "USER" role)
    let defaultRole = await Role.findOne({ name: 'USER' });
    if (!defaultRole) {
      // Create default user role if it doesn't exist
      defaultRole = await Role.create({
        name: 'USER',
        displayName: 'User',
        description: 'Default user role with basic permissions',
        permissions: ['dashboard:read'], // Basic permissions
        isActive: true,
        isSystemRole: true
      });
    }

    await User.create({
      name,
      email: email.toLowerCase(),
      password,
      roleId: defaultRole._id
    });

    return NextResponse.json(
      { success: true, message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}