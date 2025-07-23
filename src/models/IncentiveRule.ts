// models/IncentiveRule.ts
import mongoose, { Schema, Document, model, models } from 'mongoose';

// Defines the structure for a rule in the database
export interface IIncentiveRule extends Document {
  type: 'daily' | 'monthly';
  startDate: Date; // NEW: Start date for when this rule set is active
  endDate?: Date; // NEW: Optional end date, if null, it's the current active rule
  target: {
    multiplier: number;
  };
  sales: {
    includeServiceSale: boolean;
    includeProductSale: boolean;
    reviewNameValue: number;
    reviewPhotoValue: number;
  };
  incentive: {
    rate: number;
    doubleRate: number; // ADDED: The missing property for TypeScript
    applyOn: 'totalSaleValue' | 'serviceSaleOnly';
  };
}

// Mongoose schema for the incentive rules
const IncentiveRuleSchema = new Schema<IIncentiveRule>({
  type: { type: String, enum: ['daily', 'monthly'], required: true }, // Removed 'unique: true' to allow multiple rules of same type over time
  startDate: { type: Date, required: true }, // Ensure start date is always present
  endDate: { type: Date, required: false, default: null }, // Optional end date
  target: {
    multiplier: { type: Number, required: true, default: 5 },
  },
  sales: {
    includeServiceSale: { type: Boolean, default: true },
    includeProductSale: { type: Boolean, default: true },
    reviewNameValue: { type: Number, default: 200 },
    reviewPhotoValue: { type: Number, default: 300 },
  },
  incentive: {
    rate: { type: Number, required: true, default: 0.05 },
    doubleRate: { type: Number, default: 0.10 }, // ADDED: The missing field for the database schema
    applyOn: { type: String, enum: ['totalSaleValue', 'serviceSaleOnly'], default: 'totalSaleValue' }
  },
}, { timestamps: true });

// Add an index for efficient querying by type and date range
IncentiveRuleSchema.index({ type: 1, startDate: 1, endDate: 1 });

const IncentiveRule = models.IncentiveRule || model<IIncentiveRule>('IncentiveRule', IncentiveRuleSchema);

export default IncentiveRule;