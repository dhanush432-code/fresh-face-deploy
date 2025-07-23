import { NextResponse, NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Staff from '@/models/staff';
import ShopSetting, { IShopSetting } from '@/models/ShopSetting';
import Attendance, { IAttendance } from '@/models/Attendance';

interface SalaryCalculationPayload {
  staffId: string;
  month: string;
  year: number;
  otHours?: number;
  extraDays: number;
  foodDeduction: number;
  recurExpense: number;
  advanceDeducted: number;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const payload: SalaryCalculationPayload = await req.json();

    const [staff, settings] = await Promise.all([
        Staff.findById(payload.staffId).lean(),
        ShopSetting.findOne({ key: 'defaultSettings' }).lean<IShopSetting>()
    ]);

    if (!staff) { return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 }); }
    if (!settings) { return NextResponse.json({ success: false, error: 'Shop settings are not configured.' }, { status: 400 }); }

    // --- Rate Calculation (Correct) ---
    const positionRate = settings.positionRates?.find(p => p.positionName === staff.position);
    const otRate = positionRate?.otRate ?? settings.defaultOtRate;
    const extraDayRate = positionRate?.extraDayRate ?? settings.defaultExtraDayRate;
    
    let finalOtHours = payload.otHours ?? 0;

    if (payload.otHours === undefined || payload.otHours === null) {
        const monthIndex = new Date(`${payload.month} 1, ${payload.year}`).getMonth();
        const startDate = new Date(payload.year, monthIndex, 1);
        const endDate = new Date(payload.year, monthIndex + 1, 0, 23, 59, 59);

        const attendanceRecords = await Attendance.find({
            staffId: staff._id,
            date: { $gte: startDate, $lte: endDate }
        }).lean<IAttendance[]>();

        const requiredDailyHours = settings.defaultDailyHours || 8;

        // --- THE FIX FOR THE TYPESCRIPT ERROR ---
        // We now calculate total overtime by manually checking clock-in and clock-out times,
        // which are guaranteed to be in your IAttendance type.
        const totalOt = attendanceRecords.reduce((total, record) => {
            // Use 'any' to bypass the strict type check just for this calculation,
            // as we know the fields exist on the raw data from the DB.
            const recordData = record as any; 

            // Check if clockInTime and clockOutTime exist and are valid dates
            if (recordData.clockInTime && recordData.clockOutTime) {
                const clockIn = new Date(recordData.clockInTime);
                const clockOut = new Date(recordData.clockOutTime);

                // Calculate total hours worked for that day
                const durationMs = clockOut.getTime() - clockIn.getTime();
                const dailyTotalHours = durationMs / (1000 * 60 * 60);

                // Calculate overtime for this specific day using the setting
                const dailyOvertime = Math.max(0, dailyTotalHours - requiredDailyHours);
                return total + dailyOvertime;
            }
            
            // If there's no valid clock-in/out, just return the current total
            return total;
        }, 0);
        
        finalOtHours = Math.round(totalOt * 100) / 100;
    }

    const baseSalary = staff.salary || 0;
    const otAmount = finalOtHours * otRate;
    const extraDayPay = payload.extraDays * extraDayRate;
    const totalEarnings = baseSalary + otAmount + extraDayPay;
    const totalDeductions = payload.foodDeduction + payload.recurExpense + payload.advanceDeducted;
    const netSalary = totalEarnings - totalDeductions;

    return NextResponse.json({
      success: true,
      data: {
        otHours: finalOtHours,
        baseSalary,
        otAmount,
        extraDayPay,
        totalEarnings,
        totalDeductions,
        netSalary,
      },
    });

  } catch (error: any) {
    console.error('Error in /api/salary/calculate:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}