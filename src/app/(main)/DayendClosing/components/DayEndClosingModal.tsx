'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import {useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// --- TYPE DEFINITIONS ---
interface PettyCashEntry {
  _id: string;
  description: string;
  amount: number;
}

interface DailySummaryData {
  expectedTotals: {
    cash: number; card: number; upi: number; other: number; total: number;
  };
  openingBalance: number;
  pettyCash: {
    total: number;
    entries: PettyCashEntry[];
  };
}

type DenominationCounts = { [key: string]: number; };
interface DayEndClosingModalProps {
  isOpen: boolean; onClose: () => void; onSuccess: () => void; closingDate: string;
}

const denominations = [
  { value: 500, label: '₹500' }, { value: 200, label: '₹200' },
  { value: 100, label: '₹100' }, { value: 50, label: '₹50' },
  { value: 20, label: '₹20' }, { value: 10, label: '₹10' },
  { value: 2, label: '₹2' }, { value: 1, label: '₹1' },
];

const DayEndClosingModal: React.FC<DayEndClosingModalProps> = ({ isOpen, onClose, onSuccess, closingDate }) => {
  const { data: session } = useSession();
  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);

  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isOpeningBalanceOverridden, setIsOpeningBalanceOverridden] = useState(false);
  const [denominationCounts, setDenominationCounts] = useState<DenominationCounts>({});
  const [actualCardTotal, setActualCardTotal] = useState('');
  const [actualUpiTotal, setActualUpiTotal] = useState('');
  const [actualOtherTotal, setActualOtherTotal] = useState('');
  const [notes, setNotes] = useState('');
 
   // Permission checks
    const canReadDayEnd = session && (hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_READ)|| hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_MANAGE));
    const canCreateDayEnd = session && (hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_CREATE)|| hasPermission(session.user.role.permissions, PERMISSIONS.DAYEND_MANAGE));
  

 
  // --- DATA FETCHING ---
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setSummaryData(null);
      setOpeningBalance(0);
      setIsOpeningBalanceOverridden(false);
      setDenominationCounts({});
      setNotes('');
      setActualCardTotal('');
      setActualUpiTotal('');
      setActualOtherTotal('');
      
      fetch(`/api/reports/daily-summary?date=${closingDate}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) throw new Error(data.message || 'Failed to fetch daily summary.');
          const responseData: DailySummaryData = data.data;
          setSummaryData(responseData);
          setOpeningBalance(responseData.openingBalance);
        })
        .catch(e => {
          setError(e.message);
          toast.error(`Error: ${e.message}`);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, closingDate]);

  // --- CALCULATIONS ---
  const handleDenominationChange = (value: number, countStr: string) => {
    const count = parseInt(countStr) || 0;
    setDenominationCounts(prev => ({ ...prev, [`d${value}`]: count }));
  };
  
  const calculatedActualCash = useMemo(() => denominations.reduce((total, denom) => (total + (denominationCounts[`d${denom.value}`] || 0) * denom.value), 0), [denominationCounts]);
  
  const expectedInCashTotal = useMemo(() => {
    const cashFromSales = summaryData?.expectedTotals.cash || 0;
    const totalPettyCash = summaryData?.pettyCash.total || 0;
    return (openingBalance + cashFromSales) - totalPettyCash;
  }, [summaryData, openingBalance]);
  
  const cashDiscrepancy = useMemo(() => calculatedActualCash - expectedInCashTotal, [calculatedActualCash, expectedInCashTotal]);
  const cardDiscrepancy = useMemo(() => (summaryData ? (parseFloat(actualCardTotal) || 0) - summaryData.expectedTotals.card : 0), [actualCardTotal, summaryData]);
  const upiDiscrepancy = useMemo(() => (summaryData ? (parseFloat(actualUpiTotal) || 0) - summaryData.expectedTotals.upi : 0), [actualUpiTotal, summaryData]);
  const otherDiscrepancy = useMemo(() => (summaryData ? (parseFloat(actualOtherTotal) || 0) - (summaryData.expectedTotals.other || 0) : 0), [actualOtherTotal, summaryData]);
  const totalDiscrepancy = useMemo(() => cashDiscrepancy + cardDiscrepancy + upiDiscrepancy + otherDiscrepancy, [cashDiscrepancy, cardDiscrepancy, upiDiscrepancy, otherDiscrepancy]);


  // --- FORM SUBMISSION ---
  const handleSubmit = async () => {
    if (!summaryData) return;
    setIsSubmitting(true);
    setError(null);
    try {
        // --- THE FIX: Create a corrected expectedTotals object for the payload ---
        // This ensures the 'total' reflects the complete financial picture for the day.
        const correctedExpectedTotal = 
            (openingBalance || 0) + 
            (summaryData.expectedTotals.total || 0) - 
            (summaryData.pettyCash.total || 0);

        const payload = {
            closingDate, 
            openingBalance, 
            isOpeningBalanceManual: isOpeningBalanceOverridden,
            pettyCash: summaryData.pettyCash,
            expectedTotals: {
                ...summaryData.expectedTotals,
                total: correctedExpectedTotal, // Overwrite the total with the corrected, comparable value
            },
            actualTotals: {
                cash: calculatedActualCash, 
                card: parseFloat(actualCardTotal) || 0,
                upi: parseFloat(actualUpiTotal) || 0, 
                other: parseFloat(actualOtherTotal) || 0,
            },
            discrepancies: { 
                cash: cashDiscrepancy, 
                card: cardDiscrepancy, 
                upi: upiDiscrepancy, 
                other: otherDiscrepancy,
                total: totalDiscrepancy,
            },
            cashDenominations: denominationCounts, 
            notes,
        };
        const response = await fetch('/api/reports/day-end-closing', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        const result = await response.json();
        if(!response.ok || !result.success) throw new Error(result.message || 'Failed to submit report.');
        toast.success('Day-end report submitted successfully!');
        onSuccess();
        onClose();
    } catch (e: any) {
        setError(e.message);
        toast.error(e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderDiscrepancy = (amount: number) => {
    if (Math.abs(amount) < 0.01) return <span className="text-green-600">₹0.00 (Perfect Match)</span>;
    const isShort = amount < 0;
    const color = isShort ? 'text-red-600' : 'text-yellow-600';
    const label = isShort ? 'Shortage' : 'Overage';
    return <span className={color}>₹{Math.abs(amount).toFixed(2)} ({label})</span>
  };

  if (!isOpen) return null;

  return (
    // ... JSX for the modal remains unchanged ...
    canReadDayEnd && (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl my-8">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <div>
            <h3 className="text-xl font-semibold">Day-End Closing Confirmation</h3>
            <p className="text-sm text-gray-500">For Date: {new Date(closingDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded-full" disabled={isSubmitting}><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {isLoading && <p className="text-center p-8 text-gray-600">Loading today's financial data...</p>}
        {error && <div className="my-2 p-3 bg-red-100 text-red-800 text-sm rounded">{error}</div>}
        
        {!isLoading && summaryData && (
          <div className="space-y-6">
            
            <div className="p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                <h4 className="font-semibold text-lg mb-3 text-indigo-900">Cash Drawer Details</h4>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Opening Balance (Cash Float)</label>
                    <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                        <input type="number" value={openingBalance} onChange={(e) => { setOpeningBalance(parseFloat(e.target.value) || 0); setIsOpeningBalanceOverridden(true); }} className="w-full pl-7 pr-3 py-1.5 border-gray-300 rounded-md" />
                    </div>
                    {!isOpeningBalanceOverridden && <p className="text-xs text-gray-500 mt-1">Auto-filled from yesterday's closing. Override if needed.</p>}
                </div>
            </div>

            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-gray-500" />Petty Cash Expenses (from Drawer)</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {summaryData.pettyCash.entries.length > 0 ? (
                    summaryData.pettyCash.entries.map(entry => (
                      <div key={entry._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-800">{entry.description}</span>
                        <span className="text-sm font-medium">₹{entry.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : ( <p className="text-sm text-gray-500 text-center py-2">No cash expenses recorded for today.</p> )}
                </div>
            </div>

            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-lg mb-3">Physical Cash Count</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {denominations.map(d => (
                        <div key={d.value}><label className="block text-sm font-medium text-gray-700">{d.label}</label><input type="number" min="0" placeholder='Count' className="mt-1 w-full px-2 py-1.5 border-gray-300 rounded-md" onChange={(e) => handleDenominationChange(d.value, e.target.value)} /></div>
                    ))}
                </div>
                <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between"><span>Opening Balance (Float):</span> <span className="font-semibold">₹{openingBalance.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Cash from Sales (System):</span> <span className="font-semibold">₹{summaryData.expectedTotals.cash.toFixed(2)}</span></div>
                    <div className="flex justify-between text-red-600"><span>Petty Cash Expenses:</span> <span className="font-semibold">- ₹{(summaryData.pettyCash.total || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Expected In-Cash:</span> <span>₹{expectedInCashTotal.toFixed(2)}</span></div>
                    <hr className='my-1 border-dashed' />
                    <div className="flex justify-between"><span>Actual Cash (Counted):</span> <span className="font-semibold">₹{calculatedActualCash.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Cash Discrepancy:</span> <span className="font-bold">{renderDiscrepancy(cashDiscrepancy)}</span></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Card Payments</h4>
                  <label className="block text-sm font-medium text-gray-700">Actual Card Total</label>
                  <input type="number" value={actualCardTotal} onChange={e => setActualCardTotal(e.target.value)} className="mt-1 w-full px-2 py-1.5 border-gray-300 rounded-md"/>
                  <div className="bg-gray-50 p-3 mt-3 rounded-md space-y-2 text-sm">
                      <div className="flex justify-between"><span>Expected:</span> <span className="font-semibold">₹{summaryData.expectedTotals.card.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Discrepancy:</span> <span className="font-bold">{renderDiscrepancy(cardDiscrepancy)}</span></div>
                  </div>
              </div>
              <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">UPI Payments</h4>
                  <label className="block text-sm font-medium text-gray-700">Actual UPI Total</label>
                  <input type="number" value={actualUpiTotal} onChange={e => setActualUpiTotal(e.target.value)} className="mt-1 w-full px-2 py-1.5 border-gray-300 rounded-md"/>
                  <div className="bg-gray-50 p-3 mt-3 rounded-md space-y-2 text-sm">
                      <div className="flex justify-between"><span>Expected:</span> <span className="font-semibold">₹{summaryData.expectedTotals.upi.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Discrepancy:</span> <span className="font-bold">{renderDiscrepancy(upiDiscrepancy)}</span></div>
                  </div>
              </div>
              <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-lg mb-2">Other Payments</h4>
                  <label className="block text-sm font-medium text-gray-700">Actual "Other" Total</label>
                  <input type="number" value={actualOtherTotal} onChange={e => setActualOtherTotal(e.target.value)} className="mt-1 w-full px-2 py-1.5 border-gray-300 rounded-md"/>
                  <div className="bg-gray-50 p-3 mt-3 rounded-md space-y-2 text-sm">
                      <div className="flex justify-between"><span>Expected:</span> <span className="font-semibold">₹{(summaryData.expectedTotals.other || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Discrepancy:</span> <span className="font-bold">{renderDiscrepancy(otherDiscrepancy)}</span></div>
                  </div>
              </div>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-gray-700">Notes (for any discrepancies)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full px-2 py-1.5 border-gray-300 rounded-md"></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 border rounded-md hover:bg-gray-200" disabled={isSubmitting}>Cancel</button>
              <button type="button" onClick={handleSubmit} className="px-5 py-2 text-sm text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Confirm & Close Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
  )
};

export default DayEndClosingModal;