    // src/models/Brand.ts
    import mongoose, { Document, Schema, Model, models } from 'mongoose';

    // FIX: 'export' keyword added and _id is explicitly typed as a string
    export interface IProductBrand extends Document {
    _id: string;
    name: string;
    type: 'Retail' | 'In-House';
    }

    const BrandSchema: Schema<IProductBrand> = new Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Retail', 'In-House'], required: true },
    }, { timestamps: true });

    BrandSchema.index({ name: 1, type: 1 }, { unique: true });

    const BrandModel: Model<IProductBrand> = models.ProductBrand || mongoose.model<IProductBrand>('ProductBrand', BrandSchema);

    // FIX: Changed back to a default export for the model itself
    export default BrandModel;