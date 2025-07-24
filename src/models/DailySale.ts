// models/DailySale.ts

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for the rule snapshot. It captures all necessary parameters
// for a historical calculation, ensuring it's independent of future rule changes.
interface IAppliedRule {
  target: { multiplier: number };
  sales: {
    includeServiceSale: boolean;
    includeProductSale: boolean;
    reviewNameValue: number;
    reviewPhotoValue: number;
  };
  incentive: {
    rate: number;
    doubleRate: number;
    applyOn: 'totalSaleValue' | 'serviceSaleOnly';
  };
}

// Updated main interface for a DailySale document.
export interface IDailySale extends Document {
  staff: mongoose.Types.ObjectId;
  date: Date;
  serviceSale: number;
  productSale: number;
  reviewsWithName: number;
  reviewsWithPhoto: number;
  customerCount: number;
  // ✨ The snapshot field. It's optional ('?') in the interface to support
  // older records that were created before this field was added.
  appliedRule?: IAppliedRule;
}

// Schema for the embedded 'appliedRule' sub-document.
// Using a dedicated schema enforces structure and type safety in the database.
// `_id: false` prevents Mongoose from creating a separate _id for this sub-document.
const AppliedRuleSchema = new Schema<IAppliedRule>({
  target: {
    multiplier: { type: Number, required: true },
  },
  sales: {
    includeServiceSale: { type: Boolean, required: true },
    includeProductSale: { type: Boolean, required: true },
    reviewNameValue: { type: Number, required: true },
    reviewPhotoValue: { type: Number, required: true },
  },
  incentive: {
    rate: { type: Number, required: true },
    doubleRate: { type: Number, required: true },
    applyOn: { type: String, enum: ['totalSaleValue', 'serviceSaleOnly'], required: true },
  }
}, { _id: false });


// The main schema for DailySale.
const DailySaleSchema: Schema<IDailySale> = new Schema({
  staff: {
    type: Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  serviceSale: { type: Number, default: 0 },
  productSale: { type: Number, default: 0 },
  reviewsWithName: { type: Number, default: 0 },
  reviewsWithPhoto: { type: Number, default: 0 },
  customerCount: { type: Number, default: 0 },
  // ✨ Add the sub-document schema to the main schema.
  // `required: false` ensures backward compatibility with old records that
  // do not have this field. This is crucial for a smooth deployment.
  appliedRule: {
    type: AppliedRuleSchema,
    required: false,
  }
}, { timestamps: true });

// Index to ensure that a staff member can only have one sales record per day.
DailySaleSchema.index({ staff: 1, date: 1 }, { unique: true });

// This pattern prevents Mongoose from recompiling the model on every hot-reload.
const DailySale: Model<IDailySale> = mongoose.models.DailySale || mongoose.model<IDailySale>('DailySale', DailySaleSchema);

export default DailySale;