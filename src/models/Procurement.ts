// src/models/Procurement.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IProcurement extends Document {
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
    date: Date;
    vendorName: string;
    brand: string;
    unit: string;
    unitPerItem: number;
    expiryDate?: Date;
    createdBy: string;
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProcurementSchema = new Schema<IProcurement>({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    vendorName: { type: String, required: true },
    brand: { type: String, required: true },
    // FIX: Updated enum to be consistent
    unit: { type: String, required: true, enum: ['kg', 'g', 'l', 'ml', 'piece'] },
    unitPerItem: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: false },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Procurement || mongoose.model<IProcurement>('Procurement', ProcurementSchema);