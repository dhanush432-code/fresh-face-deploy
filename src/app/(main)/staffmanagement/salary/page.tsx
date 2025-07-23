'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  IndianRupee, Calendar, Search, Download,
  CreditCard, CheckCircle, X, Clock,
  ArrowUpCircle, ArrowDownCircle, History, Edit, Badge,
  FileSpreadsheet
} from 'lucide-react';
import { useStaff, StaffMember, SalaryRecordType } from '../../../../context/StaffContext';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useSession } from 'next-auth/react';
import { PERMISSIONS, hasPermission } from '../../../../lib/permissions';

// --- Interface Definitions ---
interface SalaryInputs {
  otHours: string;
  extraDays: string;
  foodDeduction: string; // Will be used for "Addition"
  recurExpense: string;  // Will be used for "Deduction"
}

// Updated to include the new positionRates array for type safety
interface ShopSettings {
  defaultOtRate: number;
  defaultExtraDayRate: number;
  positionRates?: {
    positionName: string;
    otRate: number;
    extraDayRate: number;
  }[];
}

// --- Payment Detail Sidebar Component ---
interface PaymentDetailSidebarProps {
  record: SalaryRecordType | null;
  allPaidRecords: SalaryRecordType[];
  onSelectPastPayment: (record: SalaryRecordType) => void;
  onClose: () => void;
}

const PaymentDetailSidebar: React.FC<PaymentDetailSidebarProps> = ({ record, allPaidRecords, onSelectPastPayment, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (record) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [record]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };
  
  const recentPastPayments = useMemo(() => {
    if (!record || !record.staffDetails) return [];
    return allPaidRecords
      .filter(p => p.staffDetails && p.staffDetails.id === record.staffDetails!.id && p.id !== record.id)
      .slice(0, 3);
  }, [record, allPaidRecords]);


  if (!record) return null;
  const staff = record.staffDetails;

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} aria-hidden="true"></div>
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`} role="dialog">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Payment Details</h2>
          <Button variant="ghost" onClick={handleClose} aria-label="Close panel"><X size={24} /></Button>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {staff && (
            <div className="flex items-center space-x-4">
              <img className="h-16 w-16 rounded-full object-cover ring-4 ring-slate-200" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name}/>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{staff.name}</h3>
                <p className="flex items-center gap-2 text-sm text-slate-500"><Badge size={14} /> ID: {staff.staffIdNumber || 'N/A'}</p>
                <p className="text-md text-slate-500">{staff.position}</p>
              </div>
            </div>
          )}
          <div className="bg-slate-50 p-4 rounded-lg text-center">
             <p className="text-sm text-slate-500">Net Payout for {record.month} {record.year}</p>
             <p className="text-4xl font-bold text-slate-900 my-1">₹{record.netSalary.toLocaleString('en-IN')}</p>
             <div className="flex items-center justify-center gap-2 text-green-600"><CheckCircle size={16} /><span className="text-sm font-medium">Paid on {record.paidDate ? format(parseISO(record.paidDate), 'MMM d, yyyy') : 'N/A'}</span></div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="flex items-center gap-2 text-md font-semibold text-slate-800 border-b pb-2 mb-2"><ArrowUpCircle size={20} className="text-green-500" /> Earnings</h4>
              {/* MODIFIED: "Addition" is now an earning */}
              <div className="space-y-1 text-sm"><div className="flex justify-between"><span>Base Salary</span><span className="font-medium text-slate-900">₹{record.baseSalary.toLocaleString('en-IN')}</span></div><div className="flex justify-between"><span>OT Amount ({record.otHours} hrs)</span><span className="text-green-600 font-medium">+ ₹{record.otAmount.toLocaleString('en-IN')}</span></div><div className="flex justify-between"><span>Extra Day Pay ({record.extraDays} days)</span><span className="text-green-600 font-medium">+ ₹{record.extraDayPay.toLocaleString('en-IN')}</span></div><div className="flex justify-between"><span>Addition</span><span className="text-green-600 font-medium">+ ₹{record.foodDeduction.toLocaleString('en-IN')}</span></div><div className="flex justify-between pt-2 border-t mt-2 font-bold"><span>Total Earnings</span><span className="text-slate-900">₹{record.totalEarnings.toLocaleString('en-IN')}</span></div></div>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-md font-semibold text-slate-800 border-b pb-2 mb-2"><ArrowDownCircle size={20} className="text-red-500" /> Deductions</h4>
              {/* MODIFIED: "Food Deduction" removed, "Recurring Expense" renamed */}
              <div className="space-y-1 text-sm"><div className="flex justify-between"><span>Deduction</span><span className="text-red-600 font-medium">- ₹{record.recurExpense.toLocaleString('en-IN')}</span></div><div className="flex justify-between"><span>Advance Deduction</span><span className="text-red-600 font-medium">- ₹{record.advanceDeducted.toLocaleString('en-IN')}</span></div><div className="flex justify-between pt-2 border-t mt-2 font-bold"><span>Total Deductions</span><span className="text-slate-900">₹{record.totalDeductions.toLocaleString('en-IN')}</span></div></div>
            </div>
          </div>
          
          {recentPastPayments.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-md font-semibold text-slate-800 border-b pb-2 mb-2">
                <History size={20} className="text-slate-500" /> Recent Payment History
              </h4>
              <div className="space-y-3">
                {recentPastPayments.map(pastRecord => (
                  <div key={pastRecord.id} onClick={() => onSelectPastPayment(pastRecord)} className="p-3 bg-white border rounded-lg hover:bg-slate-100 hover:shadow-sm cursor-pointer transition-all flex justify-between items-center">
                    <div>
                        <p className="font-bold text-md text-slate-900">₹{pastRecord.netSalary.toLocaleString('en-IN')}</p>
                        <p className="text-sm text-slate-600 mt-1">For {pastRecord.month} {pastRecord.year}</p>
                        <p className="text-xs text-slate-400">Paid on {format(parseISO(pastRecord.paidDate!), 'MMM d, yyyy')}</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 shrink-0">
                        <CheckCircle size={14} /> Paid
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- Main Salary Component ---
const Salary: React.FC = () => {

  const { data: session } = useSession();
  const userPermissions = useMemo(() => session?.user?.role?.permissions || [], [session]);

  const canManageSalary = useMemo(() => hasPermission(userPermissions, PERMISSIONS.STAFF_SALARY_MANAGE), [userPermissions]);
  
  const {
    staffMembers,
    salaryRecords,
    processSalary, 
    markSalaryAsPaid,
    advancePayments,
    fetchSalaryRecords,
    loadingSalary
  } = useStaff();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, { processing?: boolean; paying?: boolean }>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingStaff, setProcessingStaff] = useState<StaffMember | null>(null);
  const [editingRecord, setEditingRecord] = useState<SalaryRecordType | null>(null);
  const [salaryInputs, setSalaryInputs] = useState<SalaryInputs>({ otHours: '0', extraDays: '0', foodDeduction: '0', recurExpense: '0' });
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [selectedPaymentRecord, setSelectedPaymentRecord] = useState<SalaryRecordType | null>(null);

  const months = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);
  const years = useMemo(() => {
    const startYear = new Date().getFullYear() - 5;
    return Array.from({ length: 10 }, (_, i) => startYear + i);
  }, []);

  const stableFetchSalaryRecords = useCallback((filter: any) => {
    if (fetchSalaryRecords) fetchSalaryRecords(filter);
    else console.error("Salary/page.tsx: fetchSalaryRecords from context is undefined!");
  }, [fetchSalaryRecords]);

  useEffect(() => {
    stableFetchSalaryRecords({ populateStaff: 'true' });
  }, [stableFetchSalaryRecords]);
  
  const enrichedSalaryRecords = useMemo(() => {
    if (!salaryRecords.length || !staffMembers.length) {
      return salaryRecords;
    }
    return salaryRecords.map(record => {
      const fullStaffDetails = staffMembers.find(staff => {
         const recordStaffId = typeof record.staffId === 'string' ? record.staffId : (record.staffId as any)?.id;
         return staff.id === recordStaffId;
      });

      if (fullStaffDetails) {
        return { ...record, staffDetails: fullStaffDetails };
      }
      return record;
    });
  }, [salaryRecords, staffMembers]);


  const filteredStaff = useMemo(() => {
    const activeStaff = staffMembers.filter(staff => staff.status === 'active');
    if (!searchTerm) {
        return activeStaff;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return activeStaff.filter(staff =>
        staff.name.toLowerCase().includes(lowercasedFilter) ||
        (staff.staffIdNumber && staff.staffIdNumber.includes(lowercasedFilter))
    );
  }, [staffMembers, searchTerm]);
  
  const getSalaryRecord = useCallback((staffId: string): SalaryRecordType | undefined => {
    return enrichedSalaryRecords.find(r => {
      const recordStaffId = typeof r.staffId === 'string' ? r.staffId : (r.staffId as any)?.id;
      return recordStaffId === staffId && r.month === months[currentMonthIndex] && r.year === currentYear;
    });
  }, [enrichedSalaryRecords, months, currentMonthIndex, currentYear]);

  const currentMonthProcessedRecords = useMemo(() => {
    return enrichedSalaryRecords.filter(r => r.month === months[currentMonthIndex] && r.year === currentYear);
  }, [enrichedSalaryRecords, months, currentMonthIndex, currentYear]);

  const currentMonthPaidRecords = useMemo(() => {
    return currentMonthProcessedRecords.filter(r => r.isPaid);
  }, [currentMonthProcessedRecords]);

  const allPaidRecords = useMemo(() => {
    return enrichedSalaryRecords
      .filter(r => r.isPaid)
      .sort((a, b) => {
          if (!a.paidDate || !b.paidDate) return 0;
          return parseISO(b.paidDate).getTime() - parseISO(a.paidDate).getTime();
      });
  }, [enrichedSalaryRecords]);
  
  const totalSalaryExpense = useMemo(() => {
    return currentMonthPaidRecords.reduce((total, r) => total + (r.netSalary ?? 0), 0);
  }, [currentMonthPaidRecords]);
  
  const processedSalariesCount = useMemo(() => currentMonthProcessedRecords.length, [currentMonthProcessedRecords]);
  
  const paidSalariesCount = useMemo(() => currentMonthPaidRecords.length, [currentMonthPaidRecords]);

  const pendingPaymentsCount = useMemo(() => processedSalariesCount - paidSalariesCount, [processedSalariesCount, paidSalariesCount]);
  
  const openProcessingModal = async (staff: StaffMember, recordToEdit: SalaryRecordType | null = null) => {
    setProcessingStaff(staff);
    setEditingRecord(recordToEdit);
    setIsModalOpen(true);
    setIsModalLoading(true);

    try {
      const settingsRes = await fetch('/api/settings');
      const settingsResult = await settingsRes.json();
      if (!settingsResult.success) throw new Error(settingsResult.error || "Failed to fetch shop settings.");
      setShopSettings(settingsResult.data.settings); 

      if (recordToEdit) {
        setSalaryInputs({
          otHours: recordToEdit.otHours.toString(),
          extraDays: recordToEdit.extraDays.toString(),
          foodDeduction: recordToEdit.foodDeduction.toString(),
          recurExpense: recordToEdit.recurExpense.toString(),
        });
      } else {
        const attendanceRes = await fetch(`/api/attendance?action=getOvertimeTotal&staffId=${staff.id}&year=${currentYear}&month=${months[currentMonthIndex]}`);
        const attendanceResult = await attendanceRes.json();
        let otHours = '0';
        if (attendanceResult.success && attendanceResult.data.totalOtHours > 0) {
          otHours = attendanceResult.data.totalOtHours.toFixed(2);
        }
        // MODIFIED: Default for 'foodDeduction' (Addition) is now 0.
        setSalaryInputs({ otHours, extraDays: '0', foodDeduction: '0', recurExpense: '0' });
      }
    } catch (error) {
      console.error("Failed to fetch initial salary data:", error);
      toast.error("Could not fetch required data. Please check settings and try again.");
      setIsModalOpen(false);
    } finally {
      setIsModalLoading(false);
    }
  };
  
  const handleConfirmProcessOrUpdate = async () => {
    if (!processingStaff || !shopSettings) {
        toast.error("Settings data is missing. Cannot process salary.");
        return;
    }
    setButtonLoadingStates(prev => ({ ...prev, [processingStaff.id]: { processing: true } }));
    setIsModalOpen(false);

    const advanceToDeduct = editingRecord
      ? editingRecord.advanceDeducted
      : advancePayments
          ?.filter(adv => {
            const idToCompare = typeof adv.staffId === 'string' ? adv.staffId : (adv.staffId as any)?.id;
            if (idToCompare !== processingStaff.id || adv.status !== 'approved' || !adv.approvedDate) return false;
            const approvedDate = parseISO(adv.approvedDate);
            return approvedDate.getMonth() === currentMonthIndex && approvedDate.getFullYear() === currentYear;
          })
          .reduce((total, adv) => total + (Number(adv.amount) || 0), 0) || 0;

    const inputs = {
      otHours: parseFloat(salaryInputs.otHours) || 0,
      extraDays: parseFloat(salaryInputs.extraDays) || 0,
      foodDeduction: parseFloat(salaryInputs.foodDeduction) || 0, // This is now the "Addition"
      recurExpense: parseFloat(salaryInputs.recurExpense) || 0,   // This is now the "Deduction"
    };
    
    const positionRate = shopSettings.positionRates?.find(
        (p) => p.positionName === processingStaff.position
    );

    const otRate = positionRate?.otRate ?? shopSettings.defaultOtRate; 
    const extraDayRate = positionRate?.extraDayRate ?? shopSettings.defaultExtraDayRate;
    
    const baseSalary = Number(processingStaff.salary) || 0;
    
    // --- *** MODIFIED CALCULATION LOGIC *** ---
    const otAmount = inputs.otHours * otRate;
    const extraDayPay = inputs.extraDays * extraDayRate;
    // 'foodDeduction' (labeled as Addition) is now an earning.
    const totalEarnings = baseSalary + otAmount + extraDayPay + inputs.foodDeduction;
    // 'recurExpense' (labeled as Deduction) and advance are the deductions.
    const totalDeductions = inputs.recurExpense + advanceToDeduct;
    const netSalary = totalEarnings - totalDeductions;
    // --- *** END OF MODIFIED LOGIC *** ---

    const payload = {
        ...(editingRecord && { id: editingRecord.id }),
        staffId: processingStaff.id, month: months[currentMonthIndex], year: currentYear,
        baseSalary, 
        otHours: inputs.otHours, 
        otAmount, 
        extraDays: inputs.extraDays, 
        extraDayPay,
        // The value from the "Addition" input is stored in the `foodDeduction` field
        foodDeduction: inputs.foodDeduction,
        // The value from the "Deduction" input is stored in the `recurExpense` field
        recurExpense: inputs.recurExpense,
        totalEarnings, 
        totalDeductions, 
        advanceDeducted: advanceToDeduct, 
        netSalary,
        isPaid: false, 
        paidDate: null
    };

    const isUpdating = !!editingRecord;
    const processPromise = processSalary(payload as any);

    toast.promise(
      processPromise,
      {
        pending: isUpdating ? `Updating salary for ${processingStaff.name}...` : `Processing salary for ${processingStaff.name}...`,
        success: isUpdating ? `Salary updated successfully!` : `Salary processed for ${processingStaff.name}!`,
        error: {
          render({data}: any){
            return `Error: ${data.message || (isUpdating ? 'Failed to update salary' : 'Failed to process salary')}`
          }
        }
      }
    );

    try {
      await processPromise;
    } catch (error) {
      console.error("Failed to process/update salary:", error);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [processingStaff.id]: { processing: false } }));
      setProcessingStaff(null);
      setEditingRecord(null);
    }
  };

  const handlePayNow = async (record: SalaryRecordType, staff: StaffMember) => {
    if (!record || !staff) return;
    setButtonLoadingStates(prev => ({ ...prev, [staff.id]: { ...prev[staff.id], paying: true } }));
    
    const payPromise = markSalaryAsPaid(record, staff, format(new Date(), 'yyyy-MM-dd'));
    toast.promise(
      payPromise,
      {
        pending: `Paying ${staff.name}...`,
        success: `Salary marked as paid for ${staff.name}!`,
        error: {
          render({data}: any) {
            return `Payment failed: ${data.message || 'Unknown error'}`;
          }
        }
      }
    );

    try {
      await payPromise;
    } catch (error) {
      console.error("Failed to mark salary as paid:", error);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [staff.id]: { paying: false } }));
    }
  };

  const handleExportPDF = () => {
    if (currentMonthPaidRecords.length === 0) {
      toast.info("No paid salary data to export for this month.");
      return;
    }
    
    setIsExporting(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const monthStr = months[currentMonthIndex];
      const yearStr = currentYear;
      const fileName = `salary_report_paid_${monthStr.toLowerCase()}_${yearStr}.pdf`;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Salary Report', 14, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Month: ${monthStr} ${yearStr}`, 14, 28);
      
      const totalPaidExpense = currentMonthPaidRecords.reduce((total, r) => total + (r.netSalary ?? 0), 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Summary for ${monthStr} ${yearStr}:`, 14, 40);
      
      autoTable(doc, {
        startY: 45,
        theme: 'plain',
        tableWidth: 'wrap',
        styles: { fontSize: 10, cellPadding: 1 },
        columnStyles: {
            0: { halign: 'left', cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 'auto' },
        },
        body: [
            [`Total Salary Expense (Paid):`, `Rs. ${totalPaidExpense.toLocaleString('en-IN')}`],
            [`Processed Salaries:`, `${processedSalariesCount}`],
            [`Paid Salaries:`, `${paidSalariesCount}`],
            [`Pending Payments:`, `${pendingPaymentsCount}`],
        ],
      });

      // MODIFIED: Headers changed
      const tableHead = [
        '#', 'Staff ID', 'Staff Name', 'Position', 'Base Salary', 'OT Hrs', 'OT Amt',
        'Extra Days', 'Extra Day Pay', 'Total Earnings', 'Addition', 'Deduction',
        'Adv Ded', 'Total Ded', 'Net Salary', 'Paid Date'
      ];
      
      const tableBody = currentMonthPaidRecords.map((record, index) => {
        const staff = record.staffDetails;
        return [
          index + 1, staff?.staffIdNumber || 'N/A', staff?.name || 'Unknown', staff?.position || 'N/A',
          record.baseSalary.toLocaleString('en-IN'), record.otHours, record.otAmount.toLocaleString('en-IN'),
          record.extraDays, record.extraDayPay.toLocaleString('en-IN'), record.totalEarnings.toLocaleString('en-IN'),
          // The data fields are correct, just the headers above were changed
          record.foodDeduction.toLocaleString('en-IN'), record.recurExpense.toLocaleString('en-IN'),
          record.advanceDeducted.toLocaleString('en-IN'), record.totalDeductions.toLocaleString('en-IN'),
          record.netSalary.toLocaleString('en-IN'),
          record.paidDate ? format(parseISO(record.paidDate), 'dd/MM/yy') : 'N/A'
        ];
      });

      const lastSummaryY = (doc as any).lastAutoTable.finalY || 65;
      autoTable(doc, {
        head: [tableHead], body: tableBody, startY: lastSummaryY + 5,
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 15 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 } }
      });

      doc.save(fileName);
      toast.success("PDF report exported successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("An error occurred while generating the PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (currentMonthPaidRecords.length === 0) {
      toast.info("No paid salary data to export for this month.");
      return;
    }
    
    setIsExportingExcel(true);

    try {
      const monthStr = months[currentMonthIndex];
      const yearStr = currentYear;
      const fileName = `salary_report_paid_${monthStr.toLowerCase()}_${yearStr}.xlsx`;
      
      const totalPaidExpense = currentMonthPaidRecords.reduce((total, r) => total + (r.netSalary ?? 0), 0);
      const summaryData = [
        [`Salary Report for ${monthStr} ${yearStr}`],
        [],
        ['Summary'],
        ['Total Salary Expense (Paid)', `Rs. ${totalPaidExpense.toLocaleString('en-IN')}`],
        ['Processed Salaries', processedSalariesCount],
        ['Paid Salaries', paidSalariesCount],
        ['Pending Payments', pendingPaymentsCount],
        [],
      ];
      
      // MODIFIED: Headers changed
      const headers = [
        'Staff ID', 'Staff Name', 'Position', 'Base Salary', 'OT Hours', 'OT Amount',
        'Extra Days', 'Extra Day Pay', 'Total Earnings', 'Addition', 'Deduction',
        'Advance Deducted', 'Total Deductions', 'Net Salary', 'Paid Date'
      ];
      
      const reportData = currentMonthPaidRecords.map(record => {
        const staff = record.staffDetails;
        return [
          staff?.staffIdNumber || 'N/A', staff?.name || 'Unknown', staff?.position || 'N/A',
          record.baseSalary, record.otHours, record.otAmount, record.extraDays, record.extraDayPay,
          record.totalEarnings, record.foodDeduction, record.recurExpense, record.advanceDeducted,
          record.totalDeductions, record.netSalary,
          record.paidDate ? format(parseISO(record.paidDate), 'yyyy-MM-dd') : 'N/A',
        ];
      });

      const finalData = [...summaryData, headers, ...reportData];
      const worksheet = XLSX.utils.aoa_to_sheet(finalData);
      
      worksheet['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } } ];
      const colWidths = headers.map((header, i) => ({ wch: Math.max(header.length, ...finalData.map(row => (row[i] ?? '').toString().length)) + 2 }));
      worksheet['!cols'] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Salary ${monthStr} ${yearStr}`);
      
      XLSX.writeFile(workbook, fileName);
      toast.success("Excel report exported successfully!");
    } catch (error) {
      console.error("Failed to generate Excel file:", error);
      toast.error("An error occurred while generating the Excel file.");
    } finally {
      setIsExportingExcel(false);
    }
  };
  
  const DataField = ({ label, value, type = 'base' }: { label: string; value: number | string; type?: 'base' | 'earning' | 'deduction' }) => {
    let prefix = '₹';
    let color = 'text-slate-900';
    let displayValue = value;

    if (value === '—') {
        prefix = ''; color = 'text-slate-500';
    } else if (Number(value) === 0 && type !== 'base') {
        prefix = ''; color = 'text-slate-500'; displayValue = '0';
    } else if (type === 'earning') {
        prefix = '+₹'; color = 'text-green-600';
    } else if (type === 'deduction') {
        prefix = '-₹'; color = 'text-red-600';
    }

    return (
        <div className="text-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`font-bold ${color}`}>
                {prefix}
                {displayValue === '—' ? '—' : Number(displayValue).toLocaleString('en-IN')}
            </p>
        </div>
    );
  };

  return (
    <>
      {isModalOpen && processingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-xl z-50 transform transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{editingRecord ? 'Edit' : 'Process'} Salary for {processingStaff.name}</h3>
                    <p className="text-sm text-slate-500">For {months[currentMonthIndex]} {currentYear}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} icon={<X size={20}/>}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <h4 className="col-span-full font-bold text-slate-800 border-b pb-2 mt-2">Earnings</h4>
                    <div><label className="block text-sm font-medium text-slate-700">OT Hours</label><div className="relative"><input type="number" value={salaryInputs.otHours} onChange={e => setSalaryInputs({...salaryInputs, otHours: e.target.value})} disabled={isModalLoading} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900 text-slate-900"/>{isModalLoading && !editingRecord && <span className="absolute right-2 top-3 text-xs text-slate-500">Fetching...</span>}</div><p className="text-xs text-slate-500 mt-1">Auto-calculated on 'Process', editable here.</p></div>
                    <div><label className="block text-sm font-medium text-slate-700">Extra Days</label><input type="number" value={salaryInputs.extraDays} onChange={e => setSalaryInputs({...salaryInputs, extraDays: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900 text-slate-900"/></div>
                    
                    <h4 className="col-span-full font-bold text-slate-800 border-b pb-2 mt-4">Additions & Deductions</h4>
                    {/* MODIFIED: Input labels changed */}
                    <div><label className="block text-sm font-medium text-slate-700">Addition (₹)</label><input type="number" value={salaryInputs.foodDeduction} onChange={e => setSalaryInputs({...salaryInputs, foodDeduction: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900 text-slate-900"/></div>
                    <div><label className="block text-sm font-medium text-slate-700">Deduction (₹)</label><input type="number" value={salaryInputs.recurExpense} onChange={e => setSalaryInputs({...salaryInputs, recurExpense: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900 text-slate-900"/></div>
                </div>
                <div className="mt-8 flex justify-end space-x-3">
                  <Button variant="outline-danger" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button variant="black" onClick={handleConfirmProcessOrUpdate} isLoading={isModalLoading || buttonLoadingStates[processingStaff.id]?.processing}>
                    {editingRecord ? 'Confirm & Update' : 'Confirm & Process'}
                  </Button>
                </div>
            </div>
        </div>
      )}

      <div className="space-y-8 p-4 md:p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold text-slate-800">Salary Management</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 p-2.5 border border-slate-300 rounded-lg bg-white shadow-sm"><Calendar size={18} className="text-slate-600" /><span className="text-sm font-medium text-slate-700">{months[currentMonthIndex]} {currentYear}</span></div>
              <Button variant="outline" icon={<FileSpreadsheet size={16}/>} onClick={handleExportExcel} isLoading={isExportingExcel} disabled={loadingSalary || currentMonthPaidRecords.length === 0}>Excel</Button>
              <Button variant="black" icon={<Download size={16}/>} onClick={handleExportPDF} isLoading={isExporting} disabled={loadingSalary || currentMonthPaidRecords.length === 0}>PDF</Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"><IndianRupee className="absolute -right-4 -bottom-4 h-28 w-28 text-purple-500/10" /><div className="inline-block p-3 bg-purple-100 rounded-xl mb-4"><IndianRupee className="h-7 w-7 text-purple-600"/></div><p className="text-sm text-slate-500">Total Paid this Month</p><p className="text-3xl font-bold text-slate-800">₹{totalSalaryExpense.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p></Card>
            <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"><CheckCircle className="absolute -right-4 -bottom-4 h-28 w-28 text-teal-500/10" /><div className="inline-block p-3 bg-teal-100 rounded-xl mb-4"><CheckCircle className="h-7 w-7 text-teal-600"/></div><p className="text-sm text-slate-500">Processed Salaries</p><p className="text-3xl font-bold text-slate-800">{processedSalariesCount} <span className="text-lg font-medium text-slate-500">/ {filteredStaff.length}</span></p></Card>
            <Card className="p-6 relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"><Clock className="absolute -right-4 -bottom-4 h-28 w-28 text-amber-500/10" /><div className="inline-block p-3 bg-amber-100 rounded-xl mb-4"><Clock className="h-7 w-7 text-amber-600"/></div><p className="text-sm text-slate-500">Pending Payments</p><p className="text-3xl font-bold text-slate-800">{pendingPaymentsCount}</p></Card>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200">
                <div className="relative w-full md:w-auto"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Search staff by name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-11 pr-4 py-2.5 w-full md:w-80 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2" /></div>
                <div className="flex items-center gap-2">
                    <select value={currentMonthIndex} onChange={e => setCurrentMonthIndex(Number(e.target.value))} className="px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">{months.map((month, index) => <option key={month} value={index}>{month}</option>)}</select>
                    <select value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))} className="px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">{years.map(year => <option key={year} value={year}>{year}</option>)}</select>
                </div>
            </div>

            <div className="p-4 space-y-3">
            {loadingSalary ? (<div className="text-center py-20 text-slate-500 font-medium">Loading Salary Data...</div>) :
             filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => {
                    const record = getSalaryRecord(staff.id);
                    const isPaying = buttonLoadingStates[staff.id]?.paying;
                    const isProcessing = buttonLoadingStates[staff.id]?.processing;
                    
                    return (
                        <Card key={staff.id} className="p-4 transition-shadow hover:shadow-md border border-slate-200 rounded-lg">
                            <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-center gap-x-4 gap-y-3">
                                <div className="flex items-center gap-4 lg:col-span-3">
                                    <img className="h-11 w-11 rounded-full object-cover" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name}/>
                                    <div>
                                        <p className="text-md font-bold text-slate-900">{staff.name}</p>
                                        <p className="text-sm text-slate-500">{staff.position}</p>
                                        <p className="text-xs text-slate-500 mt-1">ID: {staff.staffIdNumber || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3 border-t lg:border-t-0 pt-3 lg:pt-0 lg:col-span-6">
                                    <DataField label="Base" value={staff.salary} type="base" />
                                    <DataField label="OT Amt" value={record ? record.otAmount : '—'} type="earning" />
                                    <DataField label="Extra Day" value={record ? record.extraDayPay : '—'} type="earning" />
                                    {/* MODIFIED: DataField labels and types updated */}
                                    <DataField label="Addition" value={record ? record.foodDeduction : '—'} type="earning" />
                                    <DataField label="Deduction" value={record ? record.recurExpense : '—'} type="deduction" />
                                    <DataField label="Adv Ded" value={record ? record.advanceDeducted : '—'} type="deduction" />
                                </div>
                                <div className="flex items-center justify-between lg:justify-end lg:col-span-3 border-t lg:border-t-0 pt-3 lg:pt-0 gap-4">
                                  <div className="text-right">
                                      <p className="text-xs text-slate-500">Net Payout</p>
                                      <p className="text-lg font-bold text-slate-900">{record ? `₹${(record.netSalary ?? 0).toLocaleString('en-IN')}` : '—'}</p>
                                  </div>
                                 <div className="flex items-center gap-2">
                                  {record ? (
                                    record.isPaid ? (
                                  <Button variant="success" size="sm" disabled icon={<CheckCircle size={14}/>} onClick={() => setSelectedPaymentRecord(record)}>Paid</Button>
                                      ) : (
      // For unpaid records, only show actions if user has permission
      canManageSalary ? (
        <>
          <Button variant="outline" size="sm" onClick={() => openProcessingModal(staff, record)} disabled={isPaying} icon={<Edit size={14}/>}>Edit</Button>
          <Button variant="black" size="sm" onClick={() => handlePayNow(record, staff)} isLoading={isPaying}>Pay Now</Button>
        </>
      ) : null // If no permission, show nothing
    )
  ) : (
    // For unprocessed records, only show actions if user has permission
    canManageSalary ? (
      <Button variant="black" size="sm" onClick={() => openProcessingModal(staff, null)} isLoading={isProcessing}>Process</Button>
    ) : null // If no permission, show nothing
  )}
</div>
                                </div>
                            </div>
                        </Card>
                    );
                })
             ) : (
                <div className="text-center py-20 text-slate-500 font-medium">No staff members found matching your search.</div>
             )}
            </div>
        </div>
      
        <div className="pt-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Payment History</h2>
            <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                        {currentMonthPaidRecords.length > 0 ? (
                            currentMonthPaidRecords.map((record) => {
                            const staff = record.staffDetails;
                            
                            return (
                                <tr key={`paid-${record.id}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedPaymentRecord(record)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {staff ? (
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-full object-cover" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name}/>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{staff.name}</div>
                                                <div className="text-xs text-slate-500">{staff.position}</div>
                                            </div>
                                        </div>
                                        ) : (
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">UN</div>
                                            <div className="ml-4"><div className="text-sm text-slate-500 italic">Unknown Staff</div></div>
                                        </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{staff?.staffIdNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{record.month} {record.year}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{record.netSalary.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{record.paidDate ? format(parseISO(record.paidDate), 'MMM d, yyyy') : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle size={14} /> Paid</span></td>
                                </tr>
                            )
                            })
                        ) : (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-500">No paid salaries for this period yet.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
      </div>
      
      <PaymentDetailSidebar 
        record={selectedPaymentRecord} 
        allPaidRecords={allPaidRecords}
        onSelectPastPayment={(record) => setSelectedPaymentRecord(record)}
        onClose={() => setSelectedPaymentRecord(null)} 
      />
    </>
  );
};

export default Salary;