import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Setting, { ILoyaltySettings } from '@/models/Setting';
import { authOptions } from '@/lib/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getServerSession } from 'next-auth';

// Helper to get settings with a fallback default for the UI
async function getLoyaltySettings(): Promise<ILoyaltySettings> {
  const defaultSettings: ILoyaltySettings = { rupeesForPoints: 100, pointsAwarded: 6 };
  try {
    const settingDoc = await Setting.findOne({ key: 'loyalty' });
    if (settingDoc) {
      return settingDoc.value;
    }
    // If no setting exists yet, we can create one with the defaults
    await Setting.create({ key: 'loyalty', value: defaultSettings });
    return defaultSettings;
  } catch (error) {
    console.error("Error fetching/creating loyalty settings, using default.", error);
    return defaultSettings;
  }
}

// ===================================================================
//  GET: Handler for fetching current loyalty settings for the admin page
// ===================================================================
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !hasPermission(session.user.role.permissions, PERMISSIONS.LOYALTY_SETTINGS_READ)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const settings = await getLoyaltySettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ===================================================================
//  PUT: Handler for UPDATING the loyalty settings from the admin page
// ===================================================================
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !hasPermission(session.user.role.permissions, PERMISSIONS.LOYALTY_SETTINGS_UPDATE)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const body: ILoyaltySettings = await req.json();

    // Validate the incoming data
    if (typeof body.rupeesForPoints !== 'number' || typeof body.pointsAwarded !== 'number' || body.rupeesForPoints <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid settings values provided.' }, { status: 400 });
    }

    // Find the setting by its key and update it. 'upsert: true' creates it if it doesn't exist.
    const updatedSetting = await Setting.findOneAndUpdate(
      { key: 'loyalty' },
      { $set: { value: body } },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Loyalty settings updated successfully!',
      settings: updatedSetting.value,
    });

  } catch (error: any) {
    console.error("Error updating loyalty settings:", error);
    return NextResponse.json({ success: false, message: 'Failed to update settings.' }, { status: 500 });
  }
}