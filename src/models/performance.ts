// src/models/Performance.ts

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for the performance metrics sub-document
export interface IPerformanceMetrics {
  customersServed: number;
  salesGenerated: number;
  serviceQuality: number;
}

// Interface for the main Performance document, linking to a Staff member
export interface IPerformance extends Document {
  staffId: mongoose.Schema.Types.ObjectId;
  month: string;
  year: number;
  rating: number;
  comments: string;
  metrics: IPerformanceMetrics;
}

// Mongoose Schema for Performance Metrics
const PerformanceMetricsSchema: Schema = new Schema({
  customersServed: {
    type: Number,
    required: [true, 'Number of customers served is required.'],
    default: 0,
  },
  salesGenerated: {
    type: Number,
    required: [true, 'Sales generated is required.'],
    default: 0,
  },
  serviceQuality: {
    type: Number,
    required: [true, 'Service quality rating is required.'],
    min: [1, 'Service quality must be at least 1.'],
    max: [10, 'Service quality cannot be more than 10.'],
    default: 0,
  },
});

// Main Mongoose Schema for Performance
const PerformanceSchema: Schema = new Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff', // This creates a reference to your existing Staff model
    required: [true, 'Staff ID is required.'],
  },
  month: {
    type: String,
    required: [true, 'Month is required.'],
  },
  year: {
    type: Number,
    required: [true, 'Year is required.'],
  },
  rating: {
    type: Number,
    required: [true, 'Overall rating is required.'],
    min: [1, 'Rating must be at least 1.'],
    max: [10, 'Rating cannot be more than 10.'],
  },
  comments: {
    type: String,
    trim: true,
  },
  metrics: {
    type: PerformanceMetricsSchema,
    required: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// To prevent model recompilation error in Next.js
const Performance: Model<IPerformance> = mongoose.models.Performance || mongoose.model<IPerformance>('Performance', PerformanceSchema);

export default Performance;