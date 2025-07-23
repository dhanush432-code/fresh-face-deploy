import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v2 as cloudinary } from 'cloudinary';

import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import EBReading, { IHistoryEntry } from '@/models/ebReadings'; // Ensure path is correct
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import Setting from '@/models/Setting'; // Ensure path is correct

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// --- UTILITY FUNCTION ---
async function uploadImage(file: File): Promise<string> {
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'eb-readings', resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        if (result) return resolve(result.secure_url);
        reject(new Error('Cloudinary upload failed.'));
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * GET /api/eb
 * Fetches recent EB readings. This function is correct.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_VIEW_CALCULATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();
    const readings = await EBReading.find({}).sort({ date: -1 }).limit(30);
    return NextResponse.json({ success: true, readings });
  } catch (error) {
    console.error('Error fetching EB readings:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/eb
 * Creates a new reading and stamps it with the current master cost. This function is correct.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_UPLOAD)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const dateString = formData.get('date') as string;

    if (!image || !dateString) {
      return NextResponse.json({ success: false, message: 'Image and date are required' }, { status: 400 });
    }

    const imageUrl = await uploadImage(image);
    
    const recordDate = new Date(dateString);
    recordDate.setUTCHours(0, 0, 0, 0);

    await connectToDatabase();

    // Fetch the master cost from settings to stamp the new record
    const costSetting = await Setting.findOne({ key: 'ebCostPerUnit' });
    const costToStamp = costSetting ? costSetting.value : 8; // Default of 8

    // Find or create the reading, stamping the cost ONLY on creation
    const reading = await EBReading.findOneAndUpdate(
      { date: recordDate },
      {
        $set: {
          morningImageUrl: imageUrl,
          updatedBy: session.user.id,
        },
        $setOnInsert: {
          date: recordDate,
          createdBy: session.user.id,
          costPerUnit: costToStamp,
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return NextResponse.json({ success: true, reading }, { status: 201 });
  } catch (error) {
    console.error('Error processing EB reading upload:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/eb
 * Updates a reading's units and recalculates costs correctly. THIS FUNCTION CONTAINS THE FIX.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_VIEW_CALCULATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { readingId, morningUnits } = await request.json();

    if (!readingId) {
      return NextResponse.json({ success: false, message: 'Reading ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const currentReading = await EBReading.findById(readingId);
    if (!currentReading) {
      return NextResponse.json({ success: false, message: 'Reading not found' }, { status: 404 });
    }

    // --- 1. Update the record that was directly edited ---
    if (morningUnits !== undefined && currentReading.morningUnits !== morningUnits) {
        const historyEntry: IHistoryEntry = {
          timestamp: new Date(),
          user: { id: session.user.id, name: session.user.name || 'Unknown' },
          changes: [{ field: 'Morning Units', oldValue: currentReading.morningUnits, newValue: morningUnits }],
        };
        currentReading.history.push(historyEntry);
        currentReading.morningUnits = morningUnits;
        currentReading.updatedBy = session.user.id;
    }

    // --- 2. Recalculate consumption for the PREVIOUS day ---
    const previousDate = new Date(currentReading.date);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousReading = await EBReading.findOne({ date: previousDate });

    if (previousReading && typeof previousReading.morningUnits === 'number' && typeof currentReading.morningUnits === 'number') {
      if (currentReading.morningUnits >= previousReading.morningUnits) {
          previousReading.unitsConsumed = currentReading.morningUnits - previousReading.morningUnits;
          
          // ▼▼▼ THE ONLY FIX NEEDED IS ON THIS LINE ▼▼▼
          // Use the cost from the CURRENT day's reading to calculate the PREVIOUS day's total.
          previousReading.totalCost = previousReading.unitsConsumed * (currentReading.costPerUnit || 8);
          
          previousReading.updatedBy = session.user.id;
          await previousReading.save();
      }
    }
    
    // --- 3. Recalculate consumption for the CURRENT day ---
    const nextDate = new Date(currentReading.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextReading = await EBReading.findOne({ date: nextDate });

    if (nextReading && typeof nextReading.morningUnits === 'number' && typeof currentReading.morningUnits === 'number') {
       if (nextReading.morningUnits >= currentReading.morningUnits) {
          currentReading.unitsConsumed = nextReading.morningUnits - currentReading.morningUnits;
          // This part was already correct: use the NEXT day's cost for the CURRENT day's total.
          currentReading.totalCost = currentReading.unitsConsumed * (nextReading.costPerUnit || 8);
       } else {
          currentReading.unitsConsumed = undefined;
          currentReading.totalCost = undefined;
       }
    } else {
      currentReading.unitsConsumed = undefined;
      currentReading.totalCost = undefined;
    }

    await currentReading.save();
    
    return NextResponse.json({ success: true, message: 'Reading updated and recalculated successfully' });
  } catch (error) {
    console.error('Error updating EB reading:', error);
    return NextResponse.json({ success: false, message: 'Internal server error while updating' }, { status: 500 });
  }
}