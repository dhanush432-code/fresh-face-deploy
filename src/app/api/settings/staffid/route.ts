// src/app/api/settings/staffid/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import ShopSetting from '../../../../models/ShopSetting';
import { Document } from 'mongoose';

// --- THIS IS THE FIX ---
// This line tells Next.js to never cache the results of this route.
// It will be re-executed on every request, ensuring fresh data.
export const dynamic = 'force-dynamic';

// GET handler to fetch the current settings
export async function GET() {
  await dbConnect();

  try {
    // Find the single settings document using its unique key.
    // If it doesn't exist, create it with the default values from the schema.
    let settings = await ShopSetting.findOne({ key: 'defaultSettings' });
    
    if (!settings) {
      console.log('No settings found, creating with default values...');
      settings = await new ShopSetting().save();
    }
    
    return NextResponse.json({ success: true, data: settings.toObject() });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to fetch settings: ${message}` }, { status: 500 });
  }
}

// POST handler to update the settings
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();

    // We use findOneAndUpdate with `upsert: true`.
    // This will update the existing settings document or create it if it doesn't exist.
    const updatedSettings = await ShopSetting.findOneAndUpdate(
      { key: 'defaultSettings' },
      { $set: body },
      { 
        new: true,           // Return the modified document
        upsert: true,        // Create the document if it doesn't exist
        runValidators: true, // Ensure the updates adhere to schema rules
      }
    );

    return NextResponse.json({ success: true, data: updatedSettings.toObject() });
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    const message = error.message || 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to update settings: ${message}` }, { status: 500 });
  }
}