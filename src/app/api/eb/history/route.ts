import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import EBReading from '@/models/ebReadings'; // Make sure this matches your model import
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_VIEW_CALCULATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const queryFilter: any = {};
    if (startDate || endDate) {
      queryFilter.date = {};
      if (startDate) {
        queryFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        queryFilter.date.$lte = endOfDay;
      }
    }

    await connectToDatabase();
    const readings = await EBReading.find(queryFilter).sort({ date: -1 });

    return NextResponse.json({ success: true, readings });
  } catch (error) {
    console.error('Error fetching EB reading history:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}