// src/app/api/target/route.ts - (FINAL CORRECTED VERSION)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TargetSheet from '@/models/TargetSheet';
import Invoice from '@/models/invoice';
import Appointment from '@/models/Appointment';

export const dynamic = 'force-dynamic';

// --- HELPER FUNCTION FOR FINANCIAL PRECISION ---
// This ensures any number is rounded to exactly two decimal places for clean API responses.
const roundToTwo = (num: number): number => {
    if (isNaN(num) || num === null) return 0;
    // The Number() wrapper handles potential floating point inaccuracies.
    return Number(Math.round(Number(num + 'e+2')) + 'e-2');
};

export async function GET(request: Request) {
    try {
        await dbConnect();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const monthIdentifier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let targetSheet = await TargetSheet.findOne({ month: monthIdentifier });

        if (!targetSheet) {
            targetSheet = { target: {} };
        }

        const targets = {
            service: targetSheet.target?.service || 0,
            retail: targetSheet.target?.retail || 0,
            bills: targetSheet.target?.bills || 0,
            abv: targetSheet.target?.abv || 0,
            callbacks: targetSheet.target?.callbacks || 0,
            appointments: targetSheet.target?.appointments || 0,
            netSales: (targetSheet.target?.service || 0) + (targetSheet.target?.retail || 0),
        };

        // This aggregation pipeline correctly reads decimal values from the database.
        const invoiceAggregation = await Invoice.aggregate([
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth }, paymentStatus: 'Paid' } },
            { $project: {
                grandTotal: { $toDouble: "$grandTotal" },
                serviceTotal: { $toDouble: "$serviceTotal" },
                productTotal: { $toDouble: "$productTotal" }
            }},
            { $addFields: { preDiscountTotal: { $add: ["$serviceTotal", "$productTotal"] } }},
            { $project: {
                grandTotal: 1,
                actualServiceRevenue: { $cond: { if: { $gt: ["$preDiscountTotal", 0] }, then: { $multiply: ["$grandTotal", { $divide: ["$serviceTotal", "$preDiscountTotal"] }] }, else: 0 }},
                actualRetailRevenue: { $cond: { if: { $gt: ["$preDiscountTotal", 0] }, then: { $multiply: ["$grandTotal", { $divide: ["$productTotal", "$preDiscountTotal"] }] }, else: 0 }}
            }},
            { $group: {
                _id: null,
                totalService: { $sum: '$actualServiceRevenue' },
                totalRetail: { $sum: '$actualRetailRevenue' },
                totalBills: { $sum: 1 },
                totalGrandAmount: { $sum: '$grandTotal' }
            }}
        ]);

        const achievedResult = invoiceAggregation[0] || {};
        
        const achievedAppointmentsCount = await Appointment.countDocuments({
            appointmentDateTime: { $gte: startOfMonth, $lte: endOfMonth },
            status: { $nin: ['Cancelled', 'No-Show'] }
        });

        const achievedNetSales = (achievedResult.totalService || 0) + (achievedResult.totalRetail || 0);

        // Apply precision rounding to all financial outputs.
        const achieved = {
            service: roundToTwo(achievedResult.totalService || 0),
            retail: roundToTwo(achievedResult.totalRetail || 0),
            bills: achievedResult.totalBills || 0,
            netSales: roundToTwo(achievedNetSales),
            abv: (achievedResult.totalBills > 0) ? roundToTwo(achievedResult.totalGrandAmount / achievedResult.totalBills) : 0,
            callbacks: 0,
            appointments: achievedAppointmentsCount,
        };

        const daysInMonth = endOfMonth.getDate();
        const dayOfMonth = now.getDate();
        const projectionFactor = dayOfMonth > 0 ? daysInMonth / dayOfMonth : 0;

        const headingTo = {
            service: roundToTwo(achieved.service * projectionFactor),
            retail: roundToTwo(achieved.retail * projectionFactor),
            bills: roundToTwo(achieved.bills * projectionFactor),
            netSales: roundToTwo(achieved.netSales * projectionFactor),
            abv: achieved.abv,
            callbacks: roundToTwo(achieved.callbacks * projectionFactor),
            appointments: roundToTwo(achieved.appointments * projectionFactor),
        };

        return NextResponse.json({
            month: monthIdentifier,
            summary: { target: targets, achieved: achieved, headingTo: headingTo }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        console.error("API Error GET /api/target:", error);
        return NextResponse.json({ message: "Error fetching target data", error: errorMessage }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const now = new Date();
        const monthIdentifier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // This logic correctly saves the decimal values sent from the corrected frontend.
        // `Number()` handles both integers and floats perfectly.
        await TargetSheet.findOneAndUpdate(
            { month: monthIdentifier },
            { 
                $set: {
                    'target.service': Number(body.service) || 0,
                    'target.retail': Number(body.retail) || 0,
                    'target.bills': Number(body.bills) || 0,
                    'target.abv': Number(body.abv) || 0,
                    'target.callbacks': Number(body.callbacks) || 0,
                    'target.appointments': Number(body.appointments) || 0,
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({ success: true, message: "Targets updated successfully." });
    } catch (error) {
        const detailedErrorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return NextResponse.json({ message: "Error updating targets", error: detailedErrorMessage }, { status: 500 });
    }
}