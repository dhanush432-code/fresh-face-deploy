import mongoose, { Schema, model, models, Document } from 'mongoose';

// A flexible schema for payment totals (used for expected and discrepancies)
const TotalsSchema = new Schema({
  cash: { type: Number, default: 0 },
  card: { type: Number, default: 0 },
  upi: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

// <-- THE FIX: This schema now correctly defines the structure for actual physical counts
const ActualTotalsSchema = new Schema({
  totalCountedCash: { type: Number, default: 0 }, // Using the descriptive name
  card: { type: Number, default: 0 },
  upi: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

// Main DayEndReport schema
const DayEndReportSchema = new Schema({
  closingDate: {
    type: Date,
    required: true,
    unique: true,
    index: true,
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  isOpeningBalanceManual: {
    type: Boolean,
    default: false,
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    //required: true,
  },
  pettyCash: {
    total: { type: Number, default: 0 },
    expenseIds: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'Expense'
    }], 
  },
  expectedTotals: TotalsSchema,
  // <-- THE FIX: The main schema now uses the correct ActualTotalsSchema
  actualTotals: ActualTotalsSchema,
  discrepancies: TotalsSchema,
  cashDenominations: {
    type: Map,
    of: Number,
  },
  notes: {
    type: String,
    trim: true,
  },
  closedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });


// Define a TypeScript interface for better type safety
export interface IDayEndReport extends Document {
  closingDate: Date;
  openingBalance: number;
  isOpeningBalanceManual: boolean;
  pettyCash: {
    total: number;
    expenseIds: mongoose.Types.ObjectId[];
  };
  expectedTotals: { cash: number; card: number; upi: number; other: number; total: number };
  // <-- THE FIX: The TS interface is also updated to match the schema
  actualTotals: { totalCountedCash: number; card: number; upi: number; other: number; total: number };
  discrepancies: { cash: number; card: number; upi: number; other: number; total: number };
  cashDenominations: Map<string, number>;
  notes?: string;
  closedBy: mongoose.Types.ObjectId;
}

const DayEndReport = models.DayEndReport || model<IDayEndReport>('DayEndReport', DayEndReportSchema);

export default DayEndReport;