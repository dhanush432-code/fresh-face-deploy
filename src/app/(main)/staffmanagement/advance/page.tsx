'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  IndianRupee, Calendar, Search, Download,
  CreditCard, CheckCircle, X, Clock,
  ArrowUpCircle, ArrowDownCircle, History, Edit, Wallet, Plus, FileText, BarChart, Hourglass, CheckCircle2, XCircle, Banknote, Scale,
  FileDown
} from 'lucide-react';
import { useStaff, StaffMember, AdvancePaymentType } from '../../../../context/StaffContext';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

import { useSession } from 'next-auth/react';
import { PERMISSIONS, hasPermission } from '../../../../lib/permissions';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// A reusable Stat Card component
const StatCard = ({ icon, title, value, description }: { icon: React.ReactNode, title: string, value: string, description?: string }) => (
  <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200/80 transition-all hover:shadow-lg hover:-translate-y-1">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="text-gray-400">{icon}</div>
    </div>
    <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

const AdvancePayment: React.FC = () => {
   const { data: session } = useSession();
    const userPermissions = useMemo(() => session?.user?.role?.permissions || [], [session]);
    const canManageAdvance = useMemo(() => hasPermission(userPermissions, PERMISSIONS.STAFF_ADVANCE_MANAGE), [userPermissions]);
    const {
    staffMembers,
    advancePayments,
    loadingAdvancePayments,
    errorAdvancePayments,
    requestAdvance,
    updateAdvanceStatus,
  } = useStaff();

  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    staffId: '',
    amount: 0,
    reason: '',
    repaymentPlan: 'One-time deduction',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  
  const [exportFilter, setExportFilter] = useState('this_month');

  const handleOpenDetails = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff) {
      setSelectedStaff(staff);
    }
  };
  
  const handleCloseDetails = () => setSelectedStaff(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'amount' ? parseFloat(value) || 0 : value });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffId || formData.amount <= 0 || !formData.reason.trim()) {
      toast.error('Please fill all required fields: Staff, Amount, and Reason.');
      return;
    }
    setIsSubmitting(true);
    
    const submitPromise = requestAdvance({ ...formData });

    toast.promise(
      submitPromise,
      {
        pending: 'Submitting request...',
        success: 'Advance request submitted successfully!',
        error: 'Failed to submit request. Please try again.'
      }
    );

    try {
      await submitPromise;
      setShowNewRequestForm(false);
      setFormData({ staffId: '', amount: 0, reason: '', repaymentPlan: 'One-time deduction' });
    } catch (error) {
      console.error('Failed to submit advance request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const approvePromise = updateAdvanceStatus(id, 'approved');

    toast.promise(
      approvePromise,
      {
        pending: 'Approving advance...',
        success: 'Advance approved!',
        error: 'Failed to approve advance.'
      }
    );

    approvePromise.catch(error => console.error('Failed to approve advance:', error));
  };

  const handleReject = async (id: string) => {
    const rejectPromise = updateAdvanceStatus(id, 'rejected');
    
    toast.promise(
      rejectPromise,
      {
        pending: 'Rejecting advance...',
        success: 'Advance rejected.',
        error: 'Failed to reject advance.'
      }
    );
    
    rejectPromise.catch(error => console.error('Failed to reject advance:', error));
  };


  const pendingPayments = advancePayments.filter((p) => p.status === 'pending');
  const historyPayments = advancePayments
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const approvedThisMonthAmount = advancePayments
    .filter(p => {
      const approvedDate = p.approvedDate ? parseISO(p.approvedDate) : null;
      return p.status === 'approved' && approvedDate && approvedDate >= startOfCurrentMonth && approvedDate <= endOfCurrentMonth;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  let staffAdvanceHistory: AdvancePaymentType[] = [];
  let remainingSalary = 0;
  let totalAdvanceCount = 0;

  if (selectedStaff) {
    staffAdvanceHistory = advancePayments
      .filter(p => (typeof p.staffId === 'object' ? p.staffId.id : p.staffId) === selectedStaff.id)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    totalAdvanceCount = staffAdvanceHistory.filter(p => p.status === 'approved').length;
    
    const currentMonthApprovedAdvances = staffAdvanceHistory
      .filter(p => {
        const requestDate = parseISO(p.requestDate);
        return p.status === 'approved' && requestDate >= startOfCurrentMonth && requestDate <= endOfCurrentMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    remainingSalary = (selectedStaff.salary || 0) - currentMonthApprovedAdvances;
  }

  const getFilteredHistory = () => {
    // First, filter the history to only include 'approved' payments.
    const approvedHistoryPayments = historyPayments.filter(p => p.status === 'approved');
  
    const now = new Date();
    if (exportFilter === 'this_month') {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        // Then, apply the date filter on the approved payments list.
        return approvedHistoryPayments.filter(p => {
            const pDate = parseISO(p.requestDate);
            return pDate >= start && pDate <= end;
        });
    }
    if (exportFilter === 'last_month') {
        const lastMonthDate = subMonths(now, 1);
        const start = startOfMonth(lastMonthDate);
        const end = endOfMonth(lastMonthDate);
        // Apply the date filter on the approved payments list.
        return approvedHistoryPayments.filter(p => {
            const pDate = parseISO(p.requestDate);
            return pDate >= start && pDate <= end;
        });
    }
    // For 'all_time', return all approved payments.
    return approvedHistoryPayments;
  };

  const handleExportExcel = () => {
    const filteredData = getFilteredHistory();
    if (filteredData.length === 0) {
      toast.info("No approved data to export for the selected period.");
      return;
    }

    const totalAmount = filteredData.reduce((sum, p) => sum + p.amount, 0);

    const dataToExport = filteredData.map(payment => {
      const staffDetailsId = typeof payment.staffId === 'object' ? payment.staffId.id : payment.staffId;
      const staff = staffMembers.find(s => s.id === staffDetailsId);
      return {
        'Staff ID': staff?.staffIdNumber || 'N/A',
        'Staff Name': staff?.name || 'N/A',
        'Position': staff?.position || 'N/A',
        'Amount (₹)': payment.amount,
        'Request Date': format(parseISO(payment.requestDate), 'dd-MM-yyyy'),
        'Approved Date': payment.approvedDate ? format(parseISO(payment.approvedDate), 'dd-MM-yyyy') : 'N/A',
        'Reason': payment.reason
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const totalRow = [
      '', 
      '', 
      'Total Amount:',
      totalAmount, 
      '',
      '',
      '',
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [totalRow], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AdvanceHistory");

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 40 },
    ];
    
    let filenamePeriodPart = '';
    const now = new Date();
    if (exportFilter === 'this_month') {
        filenamePeriodPart = format(now, 'MMMM-yyyy');
    } else if (exportFilter === 'last_month') {
        const lastMonth = subMonths(now, 1);
        filenamePeriodPart = format(lastMonth, 'MMMM-yyyy');
    } else {
        filenamePeriodPart = 'all-time';
    }

    XLSX.writeFile(workbook, `Approved_Advances_${filenamePeriodPart}.xlsx`);
    toast.success("Excel file downloaded successfully!");
  };

  const handleExportPDF = () => {
    const filteredData = getFilteredHistory();
    if (filteredData.length === 0) {
      toast.info("No approved data to export for the selected period.");
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ["S.No", "Staff ID", "Staff Name", "Amount (₹)", "Request Date", "Approved Date"];
    const tableRows: (string | number)[][] = [];

    const totalAmount = filteredData.reduce((sum, p) => sum + p.amount, 0);

    filteredData.forEach((payment, index) => {
      const staffDetailsId = typeof payment.staffId === 'object' ? payment.staffId.id : payment.staffId;
      const staff = staffMembers.find(s => s.id === staffDetailsId);
      const paymentData = [
        index + 1,
        staff?.staffIdNumber || 'N/A',
        staff?.name || 'N/A',
        payment.amount.toLocaleString('en-IN'),
        format(parseISO(payment.requestDate), 'dd MMM, yyyy'),
        payment.approvedDate ? format(parseISO(payment.approvedDate), 'dd MMM, yyyy') : 'N/A',
      ];
      tableRows.push(paymentData);
    });
    
    let reportPeriodTitle = '';
    let filenamePeriodPart = '';
    const now = new Date();

    if (exportFilter === 'this_month') {
        reportPeriodTitle = format(now, 'MMMM yyyy');
        filenamePeriodPart = format(now, 'MMMM-yyyy');
    } else if (exportFilter === 'last_month') {
        const lastMonth = subMonths(now, 1);
        reportPeriodTitle = format(lastMonth, 'MMMM yyyy');
        filenamePeriodPart = format(lastMonth, 'MMMM-yyyy');
    } else {
        reportPeriodTitle = 'All Time';
        filenamePeriodPart = 'all-time';
    }

    doc.setFontSize(18);
    doc.text(`Approved Advance Payments - ${reportPeriodTitle}`, 14, 22);

    // --- FIX ---
    // The 'as const' assertion is added to fontStyle and halign to match the strict
    // types expected by jspdf-autotable, resolving the TypeScript error.
    const tableFooterRow = [
        { 
            content: 'Total Amount:', 
            colSpan: 3, 
            styles: { halign: 'right' as const, fontStyle: 'bold' as const } 
        },
        { 
            content: totalAmount.toLocaleString('en-IN'), 
            styles: { halign: 'right' as const, fontStyle: 'bold' as const } 
        },
        { content: '', colSpan: 2 }, // Adjusted colSpan since 'Status' column is removed
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: [tableFooterRow],
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
      footStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold' as const },
      styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
      columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 28 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30, halign: 'right' as const },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
      },
    });

    const filename = `Approved_Advances_${filenamePeriodPart}.pdf`;
    doc.save(filename);
    toast.success("PDF file downloaded successfully!");
  };


  if (loadingAdvancePayments) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-xl text-gray-600">Loading Advance Data...</div>;
  }

  if (errorAdvancePayments) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{errorAdvancePayments}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Wallet className="text-indigo-500" /> Advance Payments
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Manage and track all employee advance requests.</p>
        </div>
        <button
          onClick={() => setShowNewRequestForm(!showNewRequestForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:px-5 bg-black text-white font-semibold rounded-xl shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105"
        >
          <Plus size={20} />
          New Request
        </button>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showNewRequestForm ? 'max-h-[600px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200/80">
          <h2 className="text-xl font-semibold mb-5 text-gray-800">New Advance Request Form</h2>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="staffId" className="block text-sm font-medium text-gray-600 mb-1">Staff Member*</label>
                <select id="staffId" name="staffId" required value={formData.staffId} onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-gray-900">
                  <option value="">Select Staff</option>
                  {staffMembers.filter(s => s.status === 'active').map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name} (ID: {staff.staffIdNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)*</label>
                <input id="amount" name="amount" type="number" required min="1" step="0.01" value={formData.amount <= 0 ? '' : formData.amount} onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-gray-900"/>
              </div>
              <div className="md:col-span-2">
                 <label htmlFor="reason" className="block text-sm font-medium text-gray-600 mb-1">Reason for Advance*</label>
                 <textarea id="reason" name="reason" rows={3} required value={formData.reason} onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g., Medical emergency, family event..."/>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowNewRequestForm(false)} disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-black disabled:bg-gray-400 transition-colors">
                <FileText size={16} />
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<Hourglass size={24} />} title="Pending Requests" value={`${pendingPayments.length}`} description={`Totaling ₹${totalPendingAmount.toLocaleString('en-IN')}`} />
        <StatCard icon={<CheckCircle2 size={24} className="text-green-500"/>} title="Approved This Month" value={`₹${approvedThisMonthAmount.toLocaleString('en-IN')}`} description={format(now, 'MMMM yyyy')} />
        <StatCard icon={<BarChart size={24} />} title="Total History Records" value={`${historyPayments.length}`} description="Approved & Rejected" />
      </div>

      <div className="mb-10">
        <h3 className="text-2xl font-bold text-gray-700 mb-5">Pending Requests</h3>
        {pendingPayments.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingPayments.map(payment => {
              const staffDetailsId = typeof payment.staffId === 'object' ? payment.staffId.id : payment.staffId;
              const staff = staffMembers.find(s => s.id === staffDetailsId);
              return (
                <div key={payment.id} className="bg-white rounded-xl shadow-md border border-gray-200/80 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="p-5 flex items-center gap-4 border-b border-gray-200 cursor-pointer" onClick={() => staff && handleOpenDetails(staff.id)}>
                    <img className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200" src={staff?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff?.name || 'S')}&background=random&color=fff`} alt={staff?.name} />
                    <div>
                      <p className="font-bold text-gray-800">{staff?.name}</p>
                      <p className="text-sm text-gray-500">{staff?.position}</p>
                      <p className="text-xs text-gray-400">ID: {staff?.staffIdNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-5 flex-grow space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="text-lg font-bold text-gray-900">₹{payment.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-gray-500">Request Date</span>
                      <span className="text-sm font-medium text-gray-700">{format(parseISO(payment.requestDate), 'dd MMM, yyyy')}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700 bg-gray-100 p-2 rounded-md h-16 overflow-y-auto">{payment.reason}</p>
                    </div>
                  </div>
                 {/* MODIFIED: Conditionally render the Approve/Reject button container */}
                  {canManageAdvance && (
                    <div className="p-4 bg-gray-50/50 flex gap-3 rounded-b-xl">
                      <button onClick={() => handleApprove(payment.id)} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all">
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button onClick={() => handleReject(payment.id)} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all">
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200/80 text-gray-500">
            <CheckCircle2 size={48} className="mx-auto text-green-400 mb-4" />
            <p className="font-semibold text-lg">All caught up!</p>
            <p>There are no pending advance requests.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200/80">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center p-5 sm:p-6 border-b border-gray-200 gap-4">
            <h3 className="text-2xl font-bold text-gray-700">Advance Payment History</h3>
            <div className="flex items-center gap-2 sm:gap-3">
                <select
                    value={exportFilter}
                    onChange={(e) => setExportFilter(e.target.value)}
                    className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="all_time">All Time</option>
                </select>
                <button
                    onClick={handleExportExcel}
                    disabled={getFilteredHistory().length === 0}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Export to Excel"
                >
                    <FileDown size={16} className="text-green-600" />
                    <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                    onClick={handleExportPDF}
                    disabled={getFilteredHistory().length === 0}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Download as PDF"
                >
                    <FileDown size={16} className="text-red-600" />
                    <span className="hidden sm:inline">PDF</span>
                </button>
            </div>
        </div>
        
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Request Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Processed Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historyPayments.map((payment) => {
                const staffDetailsId = typeof payment.staffId === 'object' ? payment.staffId.id : payment.staffId;
                const staff = staffMembers.find(s => s.id === staffDetailsId);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => staff && handleOpenDetails(staff.id)}>
                      <div className="flex items-center">
                        <img className="h-11 w-11 rounded-full object-cover" src={staff?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff?.name || '')}&background=random&color=fff`} alt={staff?.name} />
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{staff?.name}</div>
                          <div className="text-sm text-gray-500">{staff?.position}</div>
                          <div className="text-xs text-gray-400">ID: {staff?.staffIdNumber || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">₹{payment.amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{format(parseISO(payment.requestDate), 'dd MMM, yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${payment.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{payment.approvedDate ? format(parseISO(payment.approvedDate), 'dd MMM, yyyy') : 'N/A'}</td>
                  </tr>
                );
              })}
              {historyPayments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-16 text-gray-500">No advance payment history available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="block md:hidden">
            <div className='divide-y divide-gray-200'>
            {historyPayments.map((payment) => {
                const staffDetailsId = typeof payment.staffId === 'object' ? payment.staffId.id : payment.staffId;
                const staff = staffMembers.find(s => s.id === staffDetailsId);
                return (
                    <div key={payment.id} className="p-4" onClick={() => staff && handleOpenDetails(staff.id)}>
                        <div className='flex justify-between items-start gap-3'>
                            <div className="flex items-center gap-3 flex-1">
                                <img className="h-11 w-11 rounded-full object-cover" src={staff?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff?.name || '')}&background=random&color=fff`} alt={staff?.name} />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{staff?.name}</p>
                                    <p className="text-xs text-gray-500">{staff?.position}</p>
                                    <p className="text-xs text-gray-400">ID: {staff?.staffIdNumber || 'N/A'}</p>
                                </div>
                            </div>
                             <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${payment.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {payment.status}
                            </span>
                        </div>
                        <div className='mt-4 pl-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                           <div className='flex flex-col'>
                                <span className='text-xs text-gray-500'>Amount</span>
                                <span className='font-semibold text-gray-800'>₹{payment.amount.toLocaleString('en-IN')}</span>
                           </div>
                           <div className='flex flex-col'>
                                <span className='text-xs text-gray-500'>Request Date</span>
                                <span className='text-gray-700'>{format(parseISO(payment.requestDate), 'dd MMM, yyyy')}</span>
                           </div>
                           <div className='flex flex-col col-span-2'>
                                <span className='text-xs text-gray-500'>Processed Date</span>
                                <span className='text-gray-700'>{payment.approvedDate ? format(parseISO(payment.approvedDate), 'dd MMM, yyyy') : 'N/A'}</span>
                           </div>
                        </div>
                    </div>
                );
            })}
             {historyPayments.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                    No history available.
                </div>
              )}
            </div>
        </div>
      </div>

      {selectedStaff && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={handleCloseDetails}></div>
          <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${selectedStaff ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-white">
                <h2 className="text-xl font-semibold text-gray-800">Employee Details</h2>
                <button onClick={handleCloseDetails} className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-grow p-4 sm:p-6 overflow-y-auto">
                <div className="flex flex-col items-center mb-6 p-6 bg-white rounded-xl shadow-md border">
                  <img className="h-24 w-24 rounded-full object-cover ring-4 ring-offset-2 ring-gray-300" src={selectedStaff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff.name)}&background=random&color=fff&size=128`} alt={selectedStaff.name} />
                  <h3 className="text-2xl font-bold text-gray-900 mt-4">{selectedStaff.name}</h3>
                  <p className="text-md text-gray-600">{selectedStaff.position}</p>
                  <p className="text-sm text-gray-500 mt-1">ID: {selectedStaff.staffIdNumber || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border text-center flex flex-col items-center justify-center">
                        <Scale className="text-gray-500 mb-2" size={24} />
                        <p className="text-xs sm:text-sm text-gray-500">Base Salary</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800">₹{selectedStaff.salary?.toLocaleString('en-IN') || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border text-center flex flex-col items-center justify-center">
                        <Banknote className="text-green-500 mb-2" size={24} />
                        <p className="text-xs sm:text-sm text-gray-500">Est. Remaining</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">₹{remainingSalary.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 px-1">
                  Advance History ({totalAdvanceCount} Approved)
                </h4>
                <div className="space-y-3 bg-white p-2 sm:p-4 rounded-xl shadow-sm border max-h-[40vh] sm:max-h-[45vh] overflow-y-auto">
                  {staffAdvanceHistory.length > 0 ? (
                    staffAdvanceHistory.map(adv => (
                      <div key={adv.id} className="flex items-center p-3 border-b last:border-b-0">
                        <div className={`mr-4 p-2 rounded-full ${adv.status === 'approved' ? 'bg-green-100 text-green-600' : adv.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                           {adv.status === 'approved' ? <CheckCircle2 size={20} /> : adv.status === 'rejected' ? <XCircle size={20} /> : <Hourglass size={20} />}
                        </div>
                        <div className='flex-grow'>
                          <p className="font-bold text-gray-900 text-base sm:text-lg">₹{adv.amount.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-gray-500 truncate" title={adv.reason}>Reason: <span className='italic'>{adv.reason}</span></p>
                        </div>
                        <div className='text-right'>
                            <p className={`text-sm font-semibold capitalize ${adv.status === 'approved' ? 'text-green-700' : adv.status === 'rejected' ? 'text-red-700' : 'text-yellow-700'}`}>{adv.status}</p>
                            <p className="text-xs text-gray-500">{format(parseISO(adv.requestDate), 'dd MMM, yyyy')}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="font-semibold">No History Found</p>
                      <p className="text-sm">This staff member has no advance payment history.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default AdvancePayment;