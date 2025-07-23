// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Customer from '@/models/customermodel';
import Invoice from '@/models/invoice';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // The date logic here is correct for using the server's local time.
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000); // More robust way to get start of next day

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999); // Ensure it includes the whole last day

    // Parallel queries for better performance
    const [
      todayAppointments,
      totalCustomers,
      monthlyInvoices,
      activeMembers,
      pendingAppointments,
      completedToday,
    ] = await Promise.all([
      // Today's appointments
      Appointment.countDocuments({
        // FIX 1: Changed 'date' to 'appointmentDateTime'
        appointmentDateTime: { $gte: startOfDay, $lt: endOfDay },
        status: { $nin: ['Cancelled', 'No-Show'] } // Also good to exclude cancelled
      }),
      
      // Total customers
      Customer.countDocuments({ isActive: true }),
      
      // Monthly revenue
      Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            paymentStatus: 'Paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // FIX 2: Added the query for active members.
      // This assumes you have an 'isMembership' field on your Customer model.
      Customer.countDocuments({ isMembership: true, isActive: true }),
      
      // Pending appointments FOR TODAY
      Appointment.countDocuments({
        // FIX 1: Changed 'date' to 'appointmentDateTime'
        appointmentDateTime: { $gte: startOfDay, $lt: endOfDay },
        status: 'Appointment' // Assuming 'Appointment' or 'Scheduled' is the pending status for today
      }),
      
      // Completed today
      Appointment.countDocuments({
        // FIX 1: Changed 'date' to 'appointmentDateTime'
        appointmentDateTime: { $gte: startOfDay, $lt: endOfDay },
        status: { $in: ['Checked-Out', 'Paid'] } // Use your final statuses before payment
      }),
    ]);

    const monthlyRevenue = monthlyInvoices[0]?.totalRevenue || 0;
    const avgSessionValue = monthlyInvoices[0]?.count > 0 
      ? monthlyRevenue / monthlyInvoices[0].count 
      : 0;

    const stats = {
      todayAppointments,
      totalCustomers,
      monthlyRevenue,
      activeMembers,
      pendingAppointments,
      completedToday,
      avgSessionValue
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}