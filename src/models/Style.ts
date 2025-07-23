import mongoose, { Schema, Document } from "mongoose";

export interface IStyle extends Document {
  name: string;
  price: number;
}

const StyleSchema = new Schema<IStyle>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const Style = mongoose.models.Style || mongoose.model<IStyle>("Style", StyleSchema);

export default Style;
