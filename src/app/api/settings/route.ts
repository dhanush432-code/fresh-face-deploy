import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ShopSetting from '@/models/ShopSetting';
import Staff from '@/models/staff'; // Import Staff model to get positions

// GET handler now fetches both settings AND all unique staff positions
export async function GET() {
    try {
        await dbConnect();

        const [settings, positions] = await Promise.all([
            ShopSetting.findOneAndUpdate(
                { key: 'defaultSettings' },
                { $setOnInsert: { key: 'defaultSettings' } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            ).lean(),
            Staff.distinct('position').exec() // Fetch unique positions
        ]);
        
        const validPositions = positions.filter(p => p && typeof p === 'string' && p.trim() !== '');

        return NextResponse.json({ 
            success: true, 
            data: {
                settings,
                positions: validPositions
            }
        });
    } catch (error: any) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST handler now saves the entire settings object, including the new rates
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const payload = await req.json();

        const updatedSettings = await ShopSetting.findOneAndUpdate(
            { key: 'defaultSettings' },
            { $set: payload },
            { new: true, runValidators: true, upsert: true }
        );

        if (!updatedSettings) {
            return NextResponse.json({ success: false, error: "Could not find or create settings." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedSettings });
    } catch (error: any) {
        console.error('Error saving settings:', error);
        if (error.name === 'ValidationError') {
            if (error.message.includes('duplicate key error') && error.message.includes('positionName')) {
                 return NextResponse.json({ success: false, error: "Each position can only have one rate setting." }, { status: 400 });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}