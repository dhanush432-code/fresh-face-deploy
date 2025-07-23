import mongoose, { Schema, Document, Model, models } from 'mongoose';

// Interface for the History sub-document to track changes
export interface IHistoryEntry {
  timestamp: Date;
  user: {
    id: string;
    name: string;
  };
  changes: {
    field: string;
    oldValue?: number;
    newValue?: number;
  }[];
}

// The main, simplified EBReading Interface
export interface IEBReading extends Document {
  date: Date;
  morningUnits?: number;
  unitsConsumed?: number; // The result of (next day's morning - this day's morning)
  costPerUnit?: number;
  totalCost?: number;
  morningImageUrl?: string;
  history: IHistoryEntry[];
  createdBy: string;
  updatedBy?: string;
}

const HistorySchema = new Schema<IHistoryEntry>({
  timestamp: { type: Date, default: Date.now },
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  changes: [{
    field: { type: String, required: true },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  }],
});

const EBReadingSchema = new Schema<IEBReading>({
  date: { 
    type: Date, 
    required: true, 
    unique: true // Ensures only one record per day
  },
  morningUnits: { type: Number, required: false },
  unitsConsumed: { type: Number, required: false },
  costPerUnit: { type: Number, required: false, default: 8 }, // A sensible default
  totalCost: { type: Number, required: false },
  morningImageUrl: { type: String, required: false },
  history: [HistorySchema],
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: false },
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const EBReading: Model<IEBReading> = models.EBReading || mongoose.model<IEBReading>('EBReading', EBReadingSchema);

export default EBReading;