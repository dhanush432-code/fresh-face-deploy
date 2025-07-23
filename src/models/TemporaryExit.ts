// models/TemporaryExit.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITemporaryExit extends Document {
  attendanceId: Types.ObjectId;
  startTime: Date;
  endTime: Date | null;
  reason: string | null;
  durationMinutes: number | null; // This is calculated and stored when endTime is set
}

const TemporaryExitSchema: Schema = new Schema({
  attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  reason: { type: String, trim: true, required: true }, // Made reason explicitly required
  durationMinutes: { type: Number, default: 0 }, // Default to 0
}, { timestamps: true });

export default mongoose.models.TemporaryExit || mongoose.model<ITemporaryExit>('TemporaryExit', TemporaryExitSchema);