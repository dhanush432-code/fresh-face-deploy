// /models/Appointment.ts - THE CORRECT AND FINAL VERSION

import mongoose, { Schema, model, models } from 'mongoose';
import './Stylist'; 
import './ServiceItem';
import './customermodel';
import './user'; // Make sure the User model is imported for the ref

const appointmentSchema = new Schema({
  customerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  
  serviceIds: [{ 
    type: Schema.Types.ObjectId,
    ref: 'ServiceItem',
    required: [true, 'At least one service is required.']
  }],
  
  stylistId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Stylist',
    required: true,
    index: true
  },
  
  billingStaffId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  appointmentType: {
    type: String,
    enum: ['Online', 'Offline'],
    required: true,
    default: 'Online'
  },
  
  status: {
    type: String,
    enum: ['Appointment', 'Checked-In', 'Checked-Out', 'Paid', 'Cancelled', 'No-Show'],
    default: 'Appointment'
  },
  
  // === THIS IS THE SINGLE MOST IMPORTANT CHANGE ===
  // We use a SINGLE, REQUIRED field for the appointment's date and time.
  appointmentDateTime: { type: Date, required: true },

  // The old, separate, and problematic fields have been REMOVED.
  // appointmentTime: { type: Date, required: true },  <-- REMOVED
  // date: { type: Date, required: true },             <-- REMOVED
  // time: { type: String, required: true },           <-- REMOVED
  // ===============================================
  
  // These event timestamps are good to keep
  checkInTime: { type: Date, sparse: true },
  checkOutTime: { type: Date, sparse: true },
  
  notes: { type: String },
  
  // Billing and Duration info remains the same
  amount: { type: Number, default: 0, min: 0 },
  membershipDiscount: { type: Number, default: 0, min: 0 },
  finalAmount: { type: Number, default: 0, min: 0 },
  paymentDetails: {
    cash: { type: Number, default: 0, min: 0 },
    card: { type: Number, default: 0, min: 0 },
    upi: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 }
  },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', sparse: true },
  estimatedDuration: { type: Number, required: true },
  actualDuration: { type: Number, sparse: true }
  
}, { timestamps: true });

// Method to calculate appointment total remains the same
appointmentSchema.methods.calculateTotal = async function(includeAdditionalItems = []) {
  await this.populate('serviceIds customerId');
  
  let serviceTotal = 0;
  let membershipSavings = 0;
  
  for (const service of this.serviceIds) {
    const isCustomerMember = this.customerId?.isMembership || false;
    const hasDiscount = isCustomerMember && service.membershipRate;
    
    const price = hasDiscount ? service.membershipRate : service.price;
    serviceTotal += price;
    
    if (hasDiscount) {
      membershipSavings += (service.price - service.membershipRate);
    }
  }
  
  const additionalTotal = includeAdditionalItems.reduce((sum, item) => sum + item.finalPrice, 0);
  const total = serviceTotal + additionalTotal;
  
  return {
    serviceTotal,
    additionalTotal,
    membershipSavings,
    grandTotal: total,
    originalTotal: serviceTotal + membershipSavings + additionalTotal
  };
};

// Update indexes to use the new, correct field
appointmentSchema.index({ stylistId: 1, appointmentDateTime: 1 });
appointmentSchema.index({ customerId: 1, appointmentDateTime: -1 });
appointmentSchema.index({ status: 1, appointmentType: 1 });

const Appointment = models.Appointment || model('Appointment', appointmentSchema);
export default Appointment;