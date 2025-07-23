// src/app/api/settings/position-hours/route.ts
// A simplified and corrected version to clear the error.

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import ShopSetting, { IPositionHourSetting } from '../../../../models/ShopSetting';
import Staff from '../../../../models/staff';

interface PositionHourData {
  positionName: string;
  requiredHours: number;
}

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const allPositionsInUse: string[] = await Staff.distinct('position', { 
      position: { $ne: null, $ne: '' } 
    });

    const settingsDoc = await ShopSetting.findOne({ key: 'defaultSettings' }).lean();

    const savedPositionSettings: IPositionHourSetting[] = settingsDoc?.positionHours || [];
    const shopDefaultHours = settingsDoc?.defaultDailyHours ?? 8;

    const settingsMap = new Map<string, number>();
    savedPositionSettings.forEach(setting => {
      settingsMap.set(setting.positionName, setting.requiredHours);
    });

    const responseData: PositionHourData[] = allPositionsInUse.map(position => ({
      positionName: position,
      requiredHours: settingsMap.get(position) ?? (shopDefaultHours * 22),
    }));
    
    responseData.sort((a, b) => a.positionName.localeCompare(b.positionName));

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error('API Error in GET /api/settings/position-hours:', error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body: PositionHourData[] = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request body. Expected an array.' }, { status: 400 });
    }

    await ShopSetting.findOneAndUpdate(
        { key: 'defaultSettings' },
        { $set: { positionHours: body } },
        { new: true, upsert: true }
    );

    return NextResponse.json({ 
        success: true, 
        message: 'Settings saved successfully.',
    });

  } catch (error) {
    console.error('API Error in POST /api/settings/position-hours:', error);
    const message = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}