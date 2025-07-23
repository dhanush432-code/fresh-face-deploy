import ExcelJS from "exceljs";
// --- NEW IMPORTS ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// --- END NEW IMPORTS ---
import { ReportStylistData } from "./data/reportData";

// ===================================================================================
// Helper Function: Format Duration (No changes needed)
// ===================================================================================

/**
 * Converts total minutes into a human-readable "X hr Y min" format.
 */
function formatDuration(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) {
    return "0 hr 0 min";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

// ===================================================================================
// Excel Report Generator (No changes needed)
// ===================================================================================

export async function createExcelReport(data: ReportStylistData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Stylist Performance");

  sheet.columns = [
    { header: "Stylist Name", key: "stylistName", width: 30 },
    { header: "Total Appointments", key: "totalAppointments", width: 20 },
    { header: "Total Revenue (₹)", key: "totalRevenue", width: 20, style: { numFmt: "₹ #,##0.00" } },
    { header: "Total Time Worked", key: "billedTime", width: 20 },
  ];

  data.forEach(item => {
    sheet.addRow({
      stylistName: item.stylistName || "N/A",
      totalAppointments: item.totalAppointments || 0,
      totalRevenue: item.totalRevenue || 0,
      billedTime: formatDuration(item.totalDuration),
    });
  });

  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ===================================================================================
// PDF Report Generator (Using jsPDF and jspdf-autotable)
// ===================================================================================

export async function createPdfReport(
  data: ReportStylistData[],
  startDate: Date,
  endDate: Date
): Promise<Buffer> {
  // 1. Initialize a new jsPDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 2. Add the main title and date range
  doc.setFontSize(18);
  doc.text("Stylist Performance Report", 14, 22); // (text, x, y)
  doc.setFontSize(11);
  doc.setTextColor(100); // Set color to a light grey
  doc.text(
    `For the period: ${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`,
    14,
    30
  );

  // 3. Define the table headers
  const tableHeaders = [
    "Stylist Name",
    "Total Appointments",
    "Total Revenue",
    "Total Time Worked",
  ];

  // 4. Map your data to the format required by autoTable
  const tableBody = data.map(item => [
    item.stylistName || "N/A",
    item.totalAppointments || 0,
    `${(item.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatDuration(item.totalDuration),
  ]);

  // 5. Generate the table using autoTable
  autoTable(doc, {
    startY: 40, // Y position to start the table
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid', // 'striped', 'grid', or 'plain'
    headStyles: {
      fillColor: [22, 160, 133], // A nice teal color for the header
      textColor: 255, // White text
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Stylist Name
      1: { halign: 'right' }, // Total Appointments
      2: { halign: 'right' }, // Total Revenue
      3: { halign: 'right' }, // Total Time Worked
    },
    didDrawPage: (data) => {
      // Add a footer to each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        data.settings.margin.left,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  // 6. Convert the PDF document to a Buffer
  const pdfBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfBuffer);
}