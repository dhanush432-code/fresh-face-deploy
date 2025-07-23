// app/api/appointment/[id]/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Stylist from '@/models/Stylist';
import ServiceItem from '@/models/ServiceItem';
import { getServerSession } from 'next-auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { authOptions } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.APPOINTMENTS_UPDATE)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    await connectToDatabase();

    const { id } = params;
    const updateData = await req.json();
    const currentAppointment = await Appointment.findById(id);

    if (!currentAppointment) {
      return NextResponse.json({ success: false, message: "Appointment not found." }, { status: 404 });
    }

    const oldStatus = currentAppointment.status;
    const newStatus = updateData.status;

    // Calculate new estimated duration and totals if services changed
    if (updateData.serviceIds) {
      const services = await ServiceItem.find({
        _id: { $in: updateData.serviceIds }
      }).select('duration price membershipRate');

      updateData.estimatedDuration = services.reduce((total, service) => total + service.duration, 0);

      // Recalculate totals
      const tempAppointment = new Appointment({
        ...currentAppointment.toObject(),
        serviceIds: updateData.serviceIds,
        customerId: updateData.customerId || currentAppointment.customerId
      });
      const { grandTotal, membershipSavings } = await tempAppointment.calculateTotal();
      
      updateData.finalAmount = grandTotal;
      updateData.membershipDiscount = membershipSavings;
    }

    // Handle status-specific updates
    if (newStatus !== oldStatus) {
      const currentTime = new Date();

      switch (newStatus) {
        case 'Checked-In':
          updateData.checkInTime = currentTime;
          break;

        case 'Checked-Out':
          updateData.checkOutTime = currentTime;
          if (currentAppointment.checkInTime) {
            updateData.actualDuration = Math.round(
              (currentTime.getTime() - currentAppointment.checkInTime.getTime()) / (1000 * 60)
            );
          }
          break;
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'customerId', select: 'name phoneNumber isMembership' },
      { path: 'stylistId', select: 'name' },
      { path: 'serviceIds', select: 'name price duration membershipRate' }
    ]);

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    });

  } catch (error: any) {
    console.error("API Error updating appointment:", error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}