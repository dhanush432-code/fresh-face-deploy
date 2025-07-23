// src/models/InventoryCheck.ts
import mongoose, { Document, Schema, Model, models } from 'mongoose';
import { IProduct } from './Product';
import { IUser } from './user';

export interface IInventoryCheck extends Document {
  product: mongoose.Types.ObjectId | IProduct;
  checkedBy: mongoose.Types.ObjectId | IUser;
  date: Date;
  expectedQuantity: number;
  actualQuantity: number;
  discrepancy: number;
  notes?: string;
}

const InventoryCheckSchema: Schema<IInventoryCheck> = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  checkedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  expectedQuantity: {
    type: Number,
    required: true
  },
  actualQuantity: {
    type: Number,
    required: true
  },
  discrepancy: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

const InventoryCheck: Model<IInventoryCheck> = models.InventoryCheck || mongoose.model<IInventoryCheck>('InventoryCheck', InventoryCheckSchema);

export default InventoryCheck;