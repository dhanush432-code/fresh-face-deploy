// app/api/users/billing-staff/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/user';
import role from '@/models/role';

/**
 * FIX #1: Force Dynamic Rendering
 * This export tells Next.js to treat this route as fully dynamic.
 * It will be executed on the server for every request, bypassing the
 * Next.js Data Cache entirely. This is the primary solution to your problem.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Find roles for manager and receptionist
    const roles = await role.find({ 
      name: { $in: ['MANAGER', 'RECEPTIONIST'] } 
    }).select('_id');
    
    if (roles.length === 0) {
      // No staff roles found, this is a valid but empty response.
      // It should also not be cached.
      return NextResponse.json({
        success: true,
        staff: []
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
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
    
    // Return the successful response
    return NextResponse.json({
      success: true,
      staff: staff.map(user => ({
        _id: user._id.toString(), // Good practice to stringify _id
        name: user.name,
        email: user.email,
        role: user.roleId?.name
      }))
    }, 
    {
      /**
       * FIX #2: Set Cache-Control Header
       * This header instructs downstream caches (like Netlify's CDN and the browser)
       * not to store a copy of this response.
       */
      headers: {
        'Cache-Control': 'no-store',
      },
    });
    
  } catch (error) {
    console.error('Error fetching billing staff:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch staff members'
    }, { status: 500 });
  }
}