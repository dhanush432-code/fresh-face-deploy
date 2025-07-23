// /models/shift.model.ts

import mongoose, { Schema, Document, Types, models, model } from 'mongoose';

export interface IShift extends Document {
  employeeId: Types.ObjectId; // Reference to the main Staff document
  date: Date;
  isWeekOff: boolean;
  shiftTiming: string; // Storing as a simple string like "8-5", "11-10", etc.
}

const ShiftSchema: Schema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Staff', // This links the shift to your existing Staff model
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  isWeekOff: {
    type: Boolean,
    default: false,
  },
  shiftTiming: {
    type: String, // e.g., "9-6", "12-10"
    trim: true,
    default: '',
  },
}, { timestamps: true });

// Create a compound index to ensure one shift entry per employee per day
ShiftSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Shift = models.Shift || model<IShift>('Shift', ShiftSchema);

export default Shift;