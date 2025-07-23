import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale'; // Your DailySale model
import Staff from '@/models/staff'; // Corrected capitalization for convention
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

const MONTHLY_TARGET_MULTIPLIER = 3.0;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const staffId = searchParams.get('staffId'); // Check for the new parameter

    if (!month || !year) {
      return NextResponse.json({ success: false, message: 'Month and year query parameters are required.' }, { status: 400 });
    }

    const monthIndex = parseInt(month, 10) - 1; 
    const numericYear = parseInt(year, 10);

    if (isNaN(monthIndex) || isNaN(numericYear) || monthIndex < 0 || monthIndex > 11) {
        return NextResponse.json({ success: false, message: 'Invalid month or year provided.' }, { status: 400 });
    }

    const startDate = new Date(numericYear, monthIndex, 1);
    const endDate = new Date(numericYear, monthIndex + 1, 0, 23, 59, 59);

    // ====================================================================
    // --- Logic for single staff details (for the side panel) ---
    // ====================================================================
    if (staffId) {
      if (!mongoose.Types.ObjectId.isValid(staffId)) {
        return NextResponse.json({ success: false, message: 'Invalid Staff ID format.' }, { status: 400 });
      }

      const dailyRecords = await DailySale.find({
        staff: new mongoose.Types.ObjectId(staffId),
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 }).lean();

      // Map the records to the format expected by the frontend
      const details = dailyRecords.map(record => ({
        date: record.date.toISOString(),
        serviceSales: record.serviceSale || 0,
        productSales: record.productSale || 0,
        customersServed: record.customerCount || 0,
        rating: 0,
      }));

      return NextResponse.json({ success: true, details: details });
    }

    // ====================================================================
    // --- Logic for monthly summary (for the main page) ---
    // ====================================================================
    const staffPerformance = await DailySale.aggregate([
      // 1. Filter sales records for the selected month and year
      { 
        $match: { date: { $gte: startDate, $lte: endDate } } 
      },
      // 2. Group by staff to sum up their sales and customer counts
      {
        $group: {
          _id: '$staff',
          totalSales: { $sum: { $add: ['$serviceSale', '$productSale'] } },
          // --- **THIS IS THE FIX**: We now also sum service and product sales separately ---
          totalServiceSales: { $sum: '$serviceSale' },
          totalProductSales: { $sum: '$productSale' },
          // ----------------------------------------------------------------------------
          totalCustomers: { $sum: '$customerCount' },
        },
      },
      // 3. Join with the 'staffs' collection to get staff details
      {
        $lookup: { 
          from: 'staffs', 
          localField: '_id', 
          foreignField: '_id', 
          as: 'staffDetails' 
        }
      },
      // 4. Deconstruct the staffDetails array
      { 
        $unwind: {
          path: '$staffDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // Filter out records where staff details might not be found
      {
        $match: {
          'staffDetails._id': { $exists: true }
        }
      },
      // 5. Project the final fields for the response
      {
        $project: {
          _id: 0,
          staffId: '$staffDetails._id',
          staffIdNumber: '$staffDetails.staffIdNumber', 
          name: '$staffDetails.name',
          position: '$staffDetails.position',
          image: '$staffDetails.image',
          sales: '$totalSales',
          // --- **THIS IS THE FIX**: Include the new fields in the final output ---
          totalServiceSales: '$totalServiceSales',
          totalProductSales: '$totalProductSales',
          // -----------------------------------------------------------------------
          customers: '$totalCustomers',
          
          rating: {
            $round: [
              {
                $let: {
                  vars: {
                    salaryAsNumber: { $ifNull: ['$staffDetails.salary', 0] },
                    actualSales: { $ifNull: ['$totalSales', 0] }
                  },
                  in: {
                    $let: {
                      vars: {
                        monthlyTarget: { $max: [1, { $multiply: ['$$salaryAsNumber', MONTHLY_TARGET_MULTIPLIER] }] }
                      },
                      in: {
                        $cond: {
                          if: { $eq: ['$$actualSales', 0] },
                          then: 0,
                          else: {
                            $min: [
                              10,
                              { $multiply: [{ $divide: ['$$actualSales', '$$monthlyTarget'] }, 5] }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              },
              1
            ]
          }
        },
      },
      // 6. Sort the results alphabetically by staff name
      { $sort: { name: 1 } }
    ]);

    const summary = staffPerformance.reduce(
      (acc, staff) => {
        acc.revenueGenerated += staff.sales;
        acc.totalCustomers += staff.customers;
        if (staff.rating > 0) {
            acc.totalRatingPoints += staff.rating;
            acc.validRatingsCount += 1;
        }
        return acc;
      },
      { revenueGenerated: 0, totalCustomers: 0, totalRatingPoints: 0, validRatingsCount: 0 }
    );
    
    const overallAverageRating = summary.validRatingsCount > 0 
      ? (summary.totalRatingPoints / summary.validRatingsCount) 
      : 0;

    return NextResponse.json({ 
        success: true,
        summary: {
            averageRating: parseFloat(overallAverageRating.toFixed(1)),
            totalCustomers: summary.totalCustomers,
            revenueGenerated: summary.revenueGenerated,
            avgServiceQuality: parseFloat(overallAverageRating.toFixed(1))
        },
        staffPerformance: staffPerformance 
    });

  } catch (error: any) {
    console.error("API GET /performance Error:", error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred', error: error.message }, { status: 500 });
  }
}