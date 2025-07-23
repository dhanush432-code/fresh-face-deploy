import dbConnect from "@/lib/dbConnect";
import EBReading from "@/models/ebReadings";
import Appointment from "@/models/Appointment";

export interface EbReportData {
  _id: string;
  date: string;
  startUnits?: number;
  endUnits?: number;
  unitsConsumed?: number;
  costPerUnit?: number;
  totalCost?: number;
  appointmentCount: number;
}

export async function getEbReportData(
  startDate: Date,
  endDate: Date
): Promise<EbReportData[]> {
  await dbConnect();

  // --- THIS IS THE CORRECTED LOGIC ---

  // 1. To get the 'endUnits' and 'costPerUnit' for the last day in the range,
  // we need to fetch one day BEYOND the selected end date.
  const extendedEndDate = new Date(endDate);
  extendedEndDate.setDate(endDate.getDate() + 1);

  const [ebReadings, appointments] = await Promise.all([
    // Fetch all readings from the start date up to and including the day AFTER the end date.
    // Sort ascending to make it easy to find the "next" day in the loop.
    EBReading.find({
      date: { $gte: startDate, $lte: extendedEndDate },
    }).sort({ date: 'asc' }).lean(),

    // Appointment fetching is fine as is.
    Appointment.find({
      appointmentDateTime: { $gte: startDate, $lte: endDate },
    }).select('appointmentDateTime').lean()
  ]);
  
  const appointmentCountsByDate = new Map<string, number>();
  appointments.forEach(apt => {
    const dateKey = apt.appointmentDateTime.toISOString().split('T')[0];
    appointmentCountsByDate.set(dateKey, (appointmentCountsByDate.get(dateKey) || 0) + 1);
  });
  
  const reportData = ebReadings
    // Filter out the extra day we fetched, we only needed it for the calculation.
    .filter(reading => new Date(reading.date) <= endDate)
    .map((doc, index) => {
      // The "next" reading is simply the next item in our sorted array.
      const nextReading = ebReadings[index + 1]; 
      
      const dateKey = new Date(doc.date).toISOString().split('T')[0];
      const appointmentCount = appointmentCountsByDate.get(dateKey) || 0;

      // ▼▼▼ THE FIX IS HERE ▼▼▼
      // The cost we display in the report must be the one from the NEXT day,
      // because that's what was used to calculate this day's total cost.
      const costUsedForCalculation = nextReading ? nextReading.costPerUnit : undefined;
      // ▲▲▲ END OF FIX ▲▲▲

      return {
        _id: doc._id.toString(),
        date: new Date(doc.date).toISOString(),
        startUnits: doc.morningUnits,
        endUnits: nextReading ? nextReading.morningUnits : undefined,
        unitsConsumed: doc.unitsConsumed,
        costPerUnit: costUsedForCalculation, // Use the correct cost
        totalCost: doc.totalCost,
        appointmentCount: appointmentCount,
      };
    });

  // Sort the final data descending (newest first) for the report display.
  return reportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}