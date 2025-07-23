// lib/data/reportData.ts

import Appointment from "@/models/Appointment"
import StylistModel from "@/models/Stylist" // Use the correct import name 'StylistModel'
import dbConnect from "@/lib/dbConnect"

// The interface for our final report data structure
export interface ReportStylistData {
  stylistName: string
  totalAppointments: number
  totalRevenue: number
  totalDuration: number // Duration will be in minutes
}

/**
 * Fetches and aggregates stylist performance data from the database within a given date range.
 * This function is designed to work with your specific Appointment and Stylist schemas.
 *
 * @param {Date} startDate The start of the date range (inclusive).
 * @param {Date} endDate The end of the date range (inclusive).
 * @returns {Promise<ReportStylistData[]>} A promise that resolves to an array of stylist performance objects.
 */
export async function getStylistReportData(
  startDate: Date,
  endDate: Date
): Promise<ReportStylistData[]> {
  await dbConnect()

  // The Mongoose aggregation pipeline to generate the report data
  const results = await Appointment.aggregate([
    // Stage 1: Filter appointments to include only 'Paid' ones within the specified date range.
    {
      $match: {
        // Use the correct single field for date filtering
        appointmentDateTime: {
          $gte: startDate,
          $lte: endDate,
        },
        // Only include appointments that have been successfully paid for
        status: "Paid",
      },
    },

    // Stage 2: Group the filtered appointments by the stylist's ID and calculate totals.
    {
      $group: {
        _id: "$stylistId", // Group by the stylist reference field
        totalAppointments: { $sum: 1 }, // Count the number of paid appointments
        totalRevenue: { $sum: "$finalAmount" }, // Sum the 'finalAmount' for total revenue
        totalDuration: { $sum: "$actualDuration" }, // Sum the 'actualDuration' for total work time
      },
    },

    // Stage 3: Join with the Stylists collection to get the stylist's name.
    {
      $lookup: {
        from: StylistModel.collection.name, // The collection name for Stylists
        localField: "_id", // The '_id' from our $group stage (which is the stylistId)
        foreignField: "_id", // The '_id' in the Stylist collection
        as: "stylistDetails", // The name of the new array field to add
      },
    },

    // Stage 4: Deconstruct the 'stylistDetails' array. Since we match by _id, it will only have one element.
    {
      $unwind: "$stylistDetails",
    },

    // Stage 5: Project the final shape of our data.
    {
      $project: {
        _id: 0, // Exclude the default _id field
        stylistName: "$stylistDetails.name", // Get the name from the joined document
        totalAppointments: 1, // Keep the calculated field
        totalRevenue: 1, // Keep the calculated field
        totalDuration: 1, // Keep the calculated field
      },
    },

    // Stage 6 (Optional but recommended): Sort the results by stylist name.
    {
      $sort: {
        stylistName: 1,
      },
    },
  ])

  
  return results
}