'use client';
import { DayEndReportHistoryItem } from '../hooks/useReportHistory';

const Discrepancy = ({ value }: { value: number }) => {
  // Defensive check for null/undefined values
  if (value === null || typeof value === 'undefined') {
    return <div className="font-semibold text-gray-500">-</div>;
  }
  if (Math.abs(value) < 0.01) return <div className="font-semibold text-green-600">₹0.00</div>;
  const isShort = value < 0;
  const color = isShort ? 'text-red-600' : 'text-yellow-600';
  const sign = isShort ? '-' : '+';
  return <div className={`font-semibold ${color}`}>{sign}₹{Math.abs(value).toFixed(2)}</div>;
};

// --- THE FIX: Create a dedicated, detailed view for cash reconciliation ---
const CashReconciliationDetail = ({ report }: { report: DayEndReportHistoryItem }) => {
  // Re-calculate the expected-in-drawer total based on stored values
  const expectedInDrawer = 
    (report.openingBalance ?? 0) + 
    (report.expectedTotals.cash ?? 0) - 
    (report.pettyCash?.total ?? 0);

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Cash Reconciliation</h4>
      <div className="flex justify-between"><span>Opening Balance:</span> <span>₹{(report.openingBalance ?? 0).toFixed(2)}</span></div>
      <div className="flex justify-between"><span>+ Cash from Sales:</span> <span>₹{report.expectedTotals.cash.toFixed(2)}</span></div>
      <div className="flex justify-between text-red-700"><span>- Petty Cash:</span> <span>₹{(report.pettyCash?.total ?? 0).toFixed(2)}</span></div>
      <div className="flex justify-between font-bold border-t pt-2 mt-1"><span>= Expected In Drawer:</span> <span>₹{expectedInDrawer.toFixed(2)}</span></div>
      <hr className="my-1 border-dashed" />
      <div className="flex justify-between"><span>Physically Counted:</span> <span>₹{report.actualTotals.totalCountedCash.toFixed(2)}</span></div>
      <div className="flex justify-between border-t pt-2 mt-1"><span className="text-gray-600">Discrepancy:</span> <Discrepancy value={report.discrepancies.cash} /></div>
    </div>
  );
};


export const ReportDetailView = ({ report }: { report: DayEndReportHistoryItem }) => {
  const totalActual = 
      (report.actualTotals?.totalCountedCash ?? 0) + 
      (report.actualTotals?.card ?? 0) + 
      (report.actualTotals?.upi ?? 0) +
      (report.actualTotals?.other ?? 0);

  return (
    <div className="bg-gray-50/70 p-4 md:p-6 mt-2 border-t text-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
        
        {/* --- THE FIX: Use the new detailed component --- */}
        <CashReconciliationDetail report={report} />

        <div className="space-y-2">
            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Digital Payments</h4>
            <div className="flex justify-between"><span>Card (Expected):</span> <span>₹{report.expectedTotals.card.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Card (Actual):</span> <span>₹{report.actualTotals.card.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 mt-1"><span className="text-gray-600">Card ±:</span> <Discrepancy value={report.discrepancies.card} /></div>
            <div className="flex justify-between pt-3 mt-2 border-t"><span>UPI (Expected):</span> <span>₹{report.expectedTotals.upi.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>UPI (Actual):</span> <span>₹{report.actualTotals.upi.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 mt-1"><span className="text-gray-600">UPI ±:</span> <Discrepancy value={report.discrepancies.upi} /></div>
        </div>
        <div className="space-y-2">
            <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Overall Summary</h4>
            <div className="flex justify-between"><span>Total Expected:</span> <span>₹{report.expectedTotals.total.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Total Actual:</span> <span>₹{(report.actualTotals.total ?? 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-base border-t pt-2 mt-1"><span className="text-gray-600">Net Discrepancy:</span> <Discrepancy value={report.discrepancies.total} /></div>
            {report.notes && (
                <div className="pt-3 mt-3 border-t"><h5 className="font-semibold text-xs text-gray-500 uppercase">Notes from Manager:</h5><p className="italic text-gray-700 bg-yellow-50/50 p-2 rounded mt-1">{report.notes}</p></div>
            )}
        </div>
      </div>
    </div>
  );
};