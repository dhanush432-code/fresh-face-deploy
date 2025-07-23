import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for strong typing
export interface ISetting extends Document {
  key: string;      // A unique key like "loyalty_points_rule"
  value: any;       // Can be a string, number, or a nested object
  description?: string;
  category?: string; // Optional: for grouping settings in the UI
}

// Mongoose Schema
const SettingSchema: Schema = new Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, // Ensures no duplicate setting keys
    index: true   // Improves lookup performance
  },
  value: { 
    type: Schema.Types.Mixed, // Allows for flexible value types
    required: true 
  },
  description: { type: String },
  category: { type: String, default: 'General' }
}, { timestamps: true });

// Create and export the model
const Setting: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
export default Setting;