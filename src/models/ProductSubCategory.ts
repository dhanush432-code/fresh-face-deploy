import mongoose, { Document, Schema, Model, models, Types } from 'mongoose';
import { IProductBrand } from './ProductBrand'; // Import for type safety

export interface IProductSubCategory extends Document {
  _id: string;
  name: string;
  brand: Types.ObjectId | IProductBrand;
  type: 'Retail' | 'In-House';
}

const ProductSubCategorySchema: Schema<IProductSubCategory> = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  // --- FIX 1: The 'ref' now points to the correct model name ---
  brand: { 
    type: Schema.Types.ObjectId, 
    ref: 'ProductBrand', // Changed from 'Brand'
    required: true 
  },
  type: { 
    type: String, 
    enum: ['Retail', 'In-House'], 
    required: true 
  },
}, { timestamps: true });

// Optional: A unique index to prevent duplicate sub-category names within the same brand
ProductSubCategorySchema.index({ brand: 1, name: 1 }, { unique: true });

// --- FIX 2: Register the model with the new, correct name ---
const ProductSubCategoryModel: Model<IProductSubCategory> = 
  models.ProductSubCategory || mongoose.model<IProductSubCategory>('ProductSubCategory', ProductSubCategorySchema);

export default ProductSubCategoryModel;