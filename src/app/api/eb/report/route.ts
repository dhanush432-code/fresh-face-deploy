// /app/api/eb/report/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getEbReportData } from "@/lib/data/ebReportData";
import { createEbExcelReport } from "@/lib/reportGeneratorEb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, format } = body;

    if (!startDate || !endDate || !format) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
    }

    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);

    const reportData = await getEbReportData(normalizedStartDate, normalizedEndDate);

    if (format === "excel") {
      const fileBuffer = await createEbExcelReport(reportData);
      const filename = `eb_report_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Create a new Headers object
      const headers = new Headers();

      // Set headers for the file type and download behavior
      headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      
      // --- THIS IS THE MOST IMPORTANT LINE ---
      // This tells the browser: "It's safe to let the JavaScript on the page
      // read the 'Content-Disposition' header from this response."
      headers.set("Access-Control-Expose-Headers", "Content-Disposition");
      // --- END OF IMPORTANT LINE ---

      // Return the response with the file buffer and the headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    }

    if (format === "pdf") {
      return NextResponse.json({ data: reportData });
    }

    return NextResponse.json({ message: "Invalid format type" }, { status: 400 });
  } catch (error: any) {
    console.error("EB report generation failed:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}