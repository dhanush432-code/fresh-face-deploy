// src/models/expenses.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  type: string;
  description: string;
  amount: number;
  date: Date;
}

const ExpenseSchema: Schema = new Schema({
  type: {
    type: String,
    required: [true, 'Please provide an expense type.'],
    trim: true,
    //  <-- MAKE SURE THIS LINE IS DELETED OR COMMENTED OUT
    // enum: expenseTypes, 
    //  <-- THE 'enum' RESTRICTION MUST BE GONE
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please provide the expense amount.'],
    min: [0, 'Amount cannot be negative.'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);