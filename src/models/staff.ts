// src/models/Staff.ts

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IStaff extends Document {
  _id: Types.ObjectId;
  staffIdNumber: string;
  name: string;
  email?: string; // Email is optional now
  phone?: string;
  aadharNumber: string; // Let's assume Aadhar is required
  position: string;
  joinDate: Date;
  salary?: number;
  address?: string;
  image?: string;
  status: 'active' | 'inactive';
  aadharImage?: string;
  passbookImage?: string;
  agreementImage?: string;
}

const staffSchema = new Schema<IStaff>({
  staffIdNumber: {
    type: String,
    required: [true, 'Staff ID number is required.'],
    unique: true,
    trim: true,
  },
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    unique: true,
    sparse: true, // This allows multiple documents to have a null/missing email
    trim: true,
    lowercase: true,
  },
  phone: { type: String, trim: true },
  aadharNumber: {
    type: String,
    required: true, // If it's required, `sparse` is not needed.
    unique: true,   // Every staff member MUST have a UNIQUE Aadhar number.
    trim: true,
  },
  position: { type: String, required: true, trim: true },
  joinDate: { type: Date, default: Date.now },
  salary: { type: Number },
  address: { type: String, trim: true },
  image: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  aadharImage: { type: String },
  passbookImage: { type: String },
  agreementImage: { type: String },
}, { timestamps: true });

// staffSchema.index({ email: 1 }); // REMOVE THIS LINE - it's redundant.
staffSchema.index({ status: 1, name: 1 });

const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>('Staff', staffSchema);
export default Staff;