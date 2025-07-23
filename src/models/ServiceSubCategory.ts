import mongoose, { Document, Schema, Model, models } from 'mongoose';

export interface IServiceSubCategory extends Document {
  _id: string;
  name: string;
  mainCategory: mongoose.Types.ObjectId;
}

const ServiceSubCategorySchema: Schema<IServiceSubCategory> = new Schema({
  name: { type: String, required: true, trim: true },
  mainCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
}, { timestamps: true });

ServiceSubCategorySchema.index({ name: 1, mainCategory: 1 }, { unique: true });

const ServiceSubCategoryModel: Model<IServiceSubCategory> = models.ServiceSubCategory || mongoose.model<IServiceSubCategory>('ServiceSubCategory', ServiceSubCategorySchema);
export default ServiceSubCategoryModel;