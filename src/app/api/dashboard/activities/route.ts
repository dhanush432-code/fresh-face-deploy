// app/api/dashboard/activities/route.ts
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

    const activities = [];

    // Recent appointments
    const recentAppointments = await Appointment.find({})
      .populate('customerId', 'name')
      .populate('stylistId','name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentAppointments.forEach(appointment => {
      activities.push({
        id: appointment._id.toString(),
        type: 'appointment',
        title: 'New Appointment Booked',
        description: `${appointment.customerId?.name || 'Customer'} - ${appointment.stylistId?.name}`,
        time: new Date(appointment.createdAt).toLocaleDateString()
      });
    });

    // Recent customers
    const recentCustomers = await Customer.find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    recentCustomers.forEach(customer => {
      activities.push({
        id: customer._id.toString(),
        type: 'customer',
        title: 'New Customer Registered',
        description: customer.name,
        time: new Date(customer.createdAt).toLocaleDateString()
      });
    });

    // Recent payments
    const recentPayments = await Invoice.find({ paymentStatus: 'Paid' })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    recentPayments.forEach(payment => {
      activities.push({
        id: payment._id.toString(),
        type: 'payment',
        title: 'Payment Received',
        description: `From ${payment.customerId?.name || 'Customer'}`,
        time: new Date(payment.createdAt).toLocaleDateString(),
        amount: payment.grandTotal
      });
    });

    // Sort by creation time
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ success: true, activities: activities.slice(0, 10) });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}