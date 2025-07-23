// app/api/stylists/report/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createExcelReport, createPdfReport } from "@/lib/reportGenerator"
import { getStylistReportData } from "@/lib/data/reportData"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { startDate, endDate, format } = body

    if (!startDate || !endDate || !format) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 })
    }

    // --- !!! DATE NORMALIZATION FIX !!! ---
    // The raw dates from the frontend include the current time.
    // We must adjust them to cover the entire day(s).

    // Convert string dates from the request back into Date objects
    let normalizedStartDate = new Date(startDate);
    let normalizedEndDate = new Date(endDate);

    // Set the start date to the beginning of the day (00:00:00.000)
    normalizedStartDate.setHours(0, 0, 0, 0);

    // Set the end date to the very end of the day (23:59:59.999)
    normalizedEndDate.setHours(23, 59, 59, 999);

    // (Optional but good for debugging) Log the adjusted dates to the server console
    console.log("Adjusted Start Date for Query:", normalizedStartDate.toISOString());
    console.log("Adjusted End Date for Query:", normalizedEndDate.toISOString());
    // --- !!! END FIX !!! ---


    // 1. Fetch the data from your database using the NORMALIZED dates
    const reportData = await getStylistReportData(normalizedStartDate, normalizedEndDate)

    // Log the data returned from the database to see if it's correct now
    console.log("--- DATA FROM DATABASE ---", JSON.stringify(reportData, null, 2));


    let fileBuffer: Buffer
    let contentType: string
    let filename: string

    // 2. Generate the file based on the requested format
    if (format === "excel") {
      fileBuffer = await createExcelReport(reportData)
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      filename = `stylist_report_${new Date().toISOString().split("T")[0]}.xlsx`
    } else if (format === "pdf") {
      // Pass the original, un-normalized dates to the PDF for display purposes if you want
      fileBuffer = await createPdfReport(reportData, new Date(startDate), new Date(endDate))
      contentType = "application/pdf"
      filename = `stylist_report_${new Date().toISOString().split("T")[0]}.pdf`
    } else {
      return NextResponse.json({ message: "Invalid format requested" }, { status: 400 })
    }

    // 3. Send the file back in the response
    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set("Content-Disposition", `attachment; filename="${filename}"`)

    return new NextResponse(fileBuffer, { status: 200, headers })

  } catch (error: any) {
    console.error("Report generation failed:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}