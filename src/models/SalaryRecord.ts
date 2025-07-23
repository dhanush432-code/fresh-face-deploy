// models/SalaryRecord.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Interface now includes all the detailed fields
export interface ISalaryRecord extends Document {
  _id: Types.ObjectId;
  staffId: Types.ObjectId;
  month: string;
  year: number;
  baseSalary: number;
  otHours: number;         // New
  otAmount: number;        // New (replaces 'bonus')
  extraDays: number;       // New
  extraDayPay: number;     // New
  foodDeduction: number;   // New (part of 'deductions')
  recurExpense: number;    // New (part of 'deductions')
  totalEarnings: number;   // New
  totalDeductions: number; // New
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const SalaryRecordSchema: Schema<ISalaryRecord> = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    otHours: { type: Number, default: 0 },
    otAmount: { type: Number, default: 0 },
    extraDays: { type: Number, default: 0 },
    extraDayPay: { type: Number, default: 0 },
    foodDeduction: { type: Number, default: 0 },
    recurExpense: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    advanceDeducted: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// This index is correct and ensures no duplicate records for a staff member in a given month/year.
SalaryRecordSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

const SalaryRecord: Model<ISalaryRecord> =
  mongoose.models.SalaryRecord || mongoose.model<ISalaryRecord>('SalaryRecord', SalaryRecordSchema);

export default SalaryRecord;