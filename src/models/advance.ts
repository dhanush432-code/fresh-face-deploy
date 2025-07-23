// src/models/advance.ts
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

// Interface representing a document in MongoDB.
export interface IAdvancePayment extends Document {
  staffId: Types.ObjectId;
  requestDate: Date;
  amount: number;
  reason: string;
  repaymentPlan: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedDate: Date | null;
}

const advancePaymentSchema: Schema<IAdvancePayment> = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff', // This MUST match the model name you use for Staff
      required: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [0.01, 'Amount must be a positive number.'],
    },
    reason: {
      type: String,
      required: [true, 'A reason for the advance is required.'],
      trim: true,
    },
    repaymentPlan: {
      type: String,
      required: [true, 'A repayment plan is required.'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Prevent model overwrite error in development
const AdvancePayment: Model<IAdvancePayment> =
  mongoose.models.AdvancePayment || mongoose.model<IAdvancePayment>('AdvancePayment', advancePaymentSchema);

export default AdvancePayment;