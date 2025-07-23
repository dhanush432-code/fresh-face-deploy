// models/Stylist.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStylist extends Document {
  name: string;
  experience: number;
  specialization: string;
  phone: string;
  // Availability management
  isAvailable: boolean;
  currentAppointmentId?: mongoose.Types.ObjectId;
  lastAvailabilityChange?: Date;
  
  // === ADD METHOD SIGNATURES TO INTERFACE ===
  lockStylist(appointmentId: mongoose.Types.ObjectId): Promise<IStylist>;
  unlockStylist(): Promise<IStylist>;
}

const StylistSchema: Schema<IStylist> = new Schema({
  name: {
    type: String,
    required: [true, 'Stylist name is required.'],
    trim: true,
  },
  experience: {
    type: Number,
    required: [true, 'Experience in years is required.'],
    min: 0,
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required.'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required.'],
    trim: true,
  },
  
  // === AVAILABILITY MANAGEMENT ===
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  
  currentAppointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    sparse: true
  },
  
  lastAvailabilityChange: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// === METHODS FOR STYLIST LOCKING ===
StylistSchema.methods.lockStylist = function(this: IStylist, appointmentId: mongoose.Types.ObjectId): Promise<IStylist> {
  this.isAvailable = false;
  this.currentAppointmentId = appointmentId;
  this.lastAvailabilityChange = new Date();
  return this.save();
};

StylistSchema.methods.unlockStylist = function(this: IStylist): Promise<IStylist> {
  this.isAvailable = true;
  this.currentAppointmentId = undefined;
  this.lastAvailabilityChange = new Date();
  return this.save();
};

const StylistModel: Model<IStylist> = mongoose.models.Stylist || mongoose.model<IStylist>('Stylist', StylistSchema);

export default StylistModel;
