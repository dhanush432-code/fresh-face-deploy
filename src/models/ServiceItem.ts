import mongoose, { Document, Schema, Model, models } from 'mongoose';

// Interface for consumables remains the same
export interface IServiceConsumable {
  product: mongoose.Types.ObjectId | any;
  quantity: {
    male?: number;
    female?: number;
    default: number;
  };
  unit: string;
}

// Add serviceCode to the main interface
export interface IServiceItem extends Document {
  _id: string;
  serviceCode: string; // <-- ADDED
  name: string;
  price: number;
  membershipRate?: number;
  duration: number;
  subCategory: mongoose.Types.ObjectId | any;
  consumables: IServiceConsumable[];
}

const serviceConsumableSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: {
    male: { type: Number, min: 0, required: false },
    female: { type: Number, min: 0, required: false },
    default: { type: Number, min: 0, required: true }
  },
  unit: { type: String, required: true, trim: true }
}, { _id: false });

const serviceItemSchema = new Schema({
  // Add the new serviceCode field to the schema
  serviceCode: {
    type: String,
    required: [true, 'Service Code is required.'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  membershipRate: { type: Number, min: 0, sparse: true },
  duration: { type: Number, required: true, min: 1 },
  subCategory: { type: Schema.Types.ObjectId, ref: 'ServiceSubCategory', required: true },
  consumables: [serviceConsumableSchema]
}, { timestamps: true });

// Methods and model export remain the same
const ServiceItem: Model<IServiceItem> = models.ServiceItem || mongoose.model<IServiceItem>('ServiceItem', serviceItemSchema);
export default ServiceItem;