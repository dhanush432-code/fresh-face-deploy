// /app/api/settings/membership/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

const MEMBERSHIP_FEE_KEY = 'membershipFee';

// --- GET Handler: Fetch the current fee ---
export async function GET() {
  await connectToDatabase();
  try {
    const setting = await Setting.findOne({ key: MEMBERSHIP_FEE_KEY }).lean();

    // If not found, return a default value so the frontend doesn't break
    if (!setting) {
      return NextResponse.json({ success: true, price: 0, message: "Default value, setting not found." });
    }

    return NextResponse.json({ success: true, price: parseFloat(setting.value) });

  } catch (error) {
    console.error(`[GET /api/settings/membership] ${error}`);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// --- POST Handler: Update the fee ---
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role?.permissions, PERMISSIONS.MEMBERSHIP_SETTINGS_WRITE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  await connectToDatabase();
  try {
    const { price } = await req.json();
    const numericPrice = parseFloat(price);

    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ success: false, message: 'Invalid price. Must be a non-negative number.' }, { status: 400 });
    }

    // Use findOneAndUpdate with upsert to create the setting if it doesn't exist
    await Setting.findOneAndUpdate(
      { key: MEMBERSHIP_FEE_KEY },
      { $set: { key: MEMBERSHIP_FEE_KEY, value: String(numericPrice) } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Membership fee updated successfully.' });

  } catch (error) {
    console.error(`[POST /api/settings/membership] ${error}`);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}