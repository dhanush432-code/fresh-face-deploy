// models/loyaltyTransaction.ts
import mongoose, { Schema, model, models } from 'mongoose';

const LoyaltyTransactionSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true // Very important for quickly fetching a customer's history
  },
  points: {
    type: Number,
    required: true // The absolute value of points changed
  },
  type: {
    type: String,
    enum: ['Credit', 'Debit'], // Credit = points added, Debit = points removed
    required: true
  },
  reason: {
    type: String,
    required: true // e.g., "Completed Appointment", "Manual Adjustment", "Redeemed for discount"
  },
  // Optional: Link to a specific event that triggered the points
  relatedAppointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, { timestamps: true });

const LoyaltyTransaction = models.LoyaltyTransaction || model('LoyaltyTransaction', LoyaltyTransactionSchema);

export default LoyaltyTransaction;