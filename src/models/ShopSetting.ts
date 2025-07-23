// src/models/ShopSetting.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

// --- SUB-DOCUMENT: From your "new" model ---
// Defines the structure for a single position's RATE settings.
export interface IPositionRateSetting {
  positionName: string;
  otRate: number;
  extraDayRate: number;
}

const PositionRateSettingSchema: Schema<IPositionRateSetting> = new Schema({
    positionName: {
        type: String,
        required: true,
        trim: true,
        unique: true, // Note: This ensures uniqueness within the array for a single document.
    },
    otRate: {
        type: Number,
        required: true,
        default: 0,
    },
    extraDayRate: {
        type: Number,
        required: true,
        default: 0,
    }
}, { _id: false }); // We don't need a separate _id for each sub-document.


// --- SUB-DOCUMENT: From your "old" model ---
// Defines the structure for a single position's HOUR settings.
export interface IPositionHourSetting {
  positionName: string;
  requiredHours: number;
}

const PositionHourSettingSchema: Schema<IPositionHourSetting> = new Schema({
    positionName: {
        type: String,
        required: true,
        trim: true,
    },
    requiredHours: {
        type: Number,
        required: true,
        default: 8,
    }
}, { _id: false }); // We don't need a separate _id for each sub-document.


// --- COMBINED MAIN INTERFACE ---
// This interface now includes all fields from both versions.
export interface IShopSetting extends Document {
  key: string; 
  defaultDailyHours: number;
  defaultOtRate: number;
  defaultExtraDayRate: number;
  loyaltyPointPerPrice: number;
  loyaltyPointsAwarded: number;
  staffIdBaseNumber: number;
  positionRates: IPositionRateSetting[]; // Field from your "new" model
  positionHours: IPositionHourSetting[]; // Field from your "old" model
}

// --- COMBINED MAIN SCHEMA ---
// The final schema containing all fields.
const ShopSettingSchema: Schema<IShopSetting> = new Schema({
  key: {
    type: String,
    unique: true,
    required: true,
    default: 'defaultSettings', 
  },
  defaultDailyHours: {
    type: Number,
    required: [true, 'Default daily working hours are required.'],
    default: 8,
  },
  defaultOtRate: {
    type: Number,
    required: [true, 'Default OT rate is required.'],
    default: 50,
  },
  defaultExtraDayRate: {
    type: Number,
    required: [true, 'Default extra day rate is required.'],
    default: 100,
  },
  loyaltyPointPerPrice: {
    type: Number,
    default: 100, 
  },
  loyaltyPointsAwarded: {
    type: Number,
    default: 1,   
  },
  staffIdBaseNumber: {
    type: Number,
    required: [true, 'Staff ID base number is required.'],
    default: 3101,
  },
  
  // --- Field from your "new" model ---
  positionRates: {
      type: [PositionRateSettingSchema],
      default: [],
  },

  // --- Field from your "old" model (now added back in) ---
  positionHours: {
      type: [PositionHourSettingSchema],
      default: [],
  }
}, { timestamps: true });

// Prevent recompilation of the model if it already exists
const ShopSetting: Model<IShopSetting> = mongoose.models.ShopSetting || mongoose.model<IShopSetting>('ShopSetting', ShopSettingSchema);

export default ShopSetting;