// src/app/api/expenses/route.ts

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Expense from '@/models/Expense'; // Ensure this path and filename are correct

// --- GET: Fetch all expenses ---
export async function GET() {
  try {
    await dbConnect();
    // This is now correct. It fetches expenses without populating.
    const expenses = await Expense.find({}).sort({ date: -1 });
    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error("GET Error:", error); 
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// --- POST: Add a new expense ---
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json(); // body will be e.g., { type: 'Blade', amount: 150 }
    
    // This is now correct. It creates an expense with the string type.
    const expense = await Expense.create(body);
    
    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    console.error("POST Error:", error); 
    
    if (error instanceof mongoose.Error.ValidationError) {
      let messages = Object.values(error.errors).map((val) => val.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}