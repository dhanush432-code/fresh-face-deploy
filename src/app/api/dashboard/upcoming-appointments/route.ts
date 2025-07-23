// app/api/dashboard/upcoming-appointments/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';

// Import all referenced models to ensure they are available for population
import '@/models/customermodel';
import '@/models/Stylist';
import '@/models/ServiceItem';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // --- Timezone-aware logic using native Date methods ---
    const today = new Date();
    
    // 1. Create the start of the current day in the server's local timezone.
    // By setting these to 0, we get the beginning of the day (midnight).
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // 2. Create the start of the next day. This serves as our exclusive upper bound.
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    // --- End of native Date logic ---

    const appointments = await Appointment.find({
      // The query remains the same, but now uses the manually calculated date objects.
      appointmentDateTime: { $gte: startOfDay, $lt: endOfDay }
    })
    .populate('customerId', 'name')
    .populate('stylistId', 'name')
    .populate('serviceIds', 'name')
    .sort({ appointmentDateTime: 1 })
    .limit(10)
    .lean();

    const formattedAppointments = appointments.map(apt => {
      const appointmentTime = new Date(apt.appointmentDateTime);
      const serviceNames = apt.serviceIds.map(service => service.name).join(', ');

      return {
        id: apt._id.toString(),
        customerName: apt.customerId?.name || 'Unknown Customer',
        service: serviceNames || 'No service specified',
        // Note: Using toLocaleTimeString without a specific timezone will use the
        // SERVER's default timezone (likely UTC). If you need it in a specific
        // salon timezone, the `date-fns-tz` approach is safer.
        time: appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        stylist: apt.stylistId?.name || 'Not assigned',
        status: apt.status
      };
    });

    return NextResponse.json({ success: true, appointments: formattedAppointments });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}