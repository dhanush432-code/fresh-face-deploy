// lib/reportGeneratorEb.ts

import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EbReportData } from "./data/ebReportData";

// ===================================================================================
//  EB Excel Report Generator (no changes)
// ===================================================================================
export async function createEbExcelReport(data: EbReportData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("EB Readings Report");

  sheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Start Units", key: "startUnits", width: 15 },
    { header: "End Units", key: "endUnits", width: 15 },
    { header: "Units Consumed", key: "unitsConsumed", width: 18 },
    { header: "Total Appointments", key: "appointmentCount", width: 20 },
    { header: "Cost Per Unit (₹)", key: "costPerUnit", width: 20, style: { numFmt: '"₹"#,##0.00' } },
    { header: "Total Cost (₹)", key: "totalCost", width: 20, style: { numFmt: '"₹"#,##0.00' } },
  ];

  // --- THE FIX IS HERE ---
  // We now pass `null` for missing numeric values instead of the string 'N/A'.
  data.forEach(item => {
    sheet.addRow({
      date: new Date(item.date).toLocaleDateString('en-CA'), // Using 'en-CA' for YYYY-MM-DD format
      startUnits: item.startUnits ?? null,
      endUnits: item.endUnits ?? null,
      unitsConsumed: item.unitsConsumed ?? null,
      appointmentCount: item.appointmentCount,
      costPerUnit: item.costPerUnit ?? null,
      totalCost: item.totalCost ?? null,
    });
  });
  // --- END OF FIX ---

  // Style the header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDDDDD' } // Light grey background for header
  };

  const buffer = await workbook.xlsx.writeBuffer();
  // The defensive check is good, but writeBuffer already returns a Buffer.
  return buffer as unknown as Buffer;
}


// ===================================================================================
//  EB PDF Report Generator (jsPDF version, client-side only)
// ===================================================================================
export function createEbPdfReportClient(
  data: EbReportData[],
  startDate: Date,
  endDate: Date
): jsPDF {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text("Electricity Consumption Report", 14, 20);

  // Date Range
  doc.setFontSize(12);
  doc.text(`For the period: ${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`, 14, 30);

  // Table headers and rows
  const headers = [
    [
      "Date",
      "Start Units",
      "End Units",
      "Units Consumed",
      "Total Appointments",
      "Cost Per Unit (₹)",
      "Total Cost (₹)"
    ]
  ];

  const rows = data.map(item => [
    new Date(item.date).toLocaleDateString('en-IN'),
    item.startUnits?.toFixed(2) ?? 'N/A',
    item.endUnits?.toFixed(2) ?? 'N/A',
    item.unitsConsumed?.toFixed(2) ?? 'N/A',
    item.appointmentCount.toString(),
    item.costPerUnit?.toFixed(2) ?? 'N/A',
    item.totalCost?.toFixed(2) ?? 'N/A'
  ]);

  autoTable(doc, {
    startY: 40,
    head: headers,
    body: rows,
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [139, 210, 70], // Green theme color
      textColor: 255,
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    margin: { left: 14, right: 14 },
  });

  return doc;
}
