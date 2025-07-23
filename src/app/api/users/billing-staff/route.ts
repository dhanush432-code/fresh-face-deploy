// app/api/users/billing-staff/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';
import role from '@/models/role';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Find roles for manager and receptionist
    const roles = await role.find({ 
      name: { $in: ['MANAGER', 'RECEPTIONIST'] } 
    }).select('_id');
    
    if (roles.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No manager or receptionist roles found'
      }, { status: 404 });
    }
    
    const roleIds = roles.map(role => role._id);
    
    // Find users with manager or receptionist roles
    const staff = await User.find({
      roleId: { $in: roleIds },
      isActive: true
    })
    .select('name email roleId')
    .populate('roleId', 'name')
    .sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      staff: staff.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.roleId?.name
      }))
    });
    
  } catch (error) {
    console.error('Error fetching billing staff:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch staff members'
    }, { status: 500 });
  }
}