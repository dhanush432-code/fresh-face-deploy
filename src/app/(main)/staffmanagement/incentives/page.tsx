'use client';

import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { toast } from 'react-toastify';
import { IndianRupee, Calendar, CheckCircle, XCircle, RefreshCcw, Users, Star, Gift, BarChartBig, Settings, ShoppingBag, Truck, PlusCircle, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useSession } from 'next-auth/react';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

//  Interfaces and Helper Components (NO CHANGES NEEDED HERE)

interface StaffMember { id: string; name: string; }
interface Rule { target: { multiplier: number; }; sales: { includeServiceSale: boolean; includeProductSale: boolean; reviewNameValue: number; reviewPhotoValue: number; }; incentive: { rate: number; doubleRate: number; applyOn: 'totalSaleValue' | 'serviceSaleOnly'; };}
interface SettingsProps { onClose: () => void; }
const defaultRule: Rule = { target: { multiplier: 5 }, sales: { includeServiceSale: true, includeProductSale: true, reviewNameValue: 200, reviewPhotoValue: 300 }, incentive: { rate: 0.05, doubleRate: 0.10, applyOn: 'totalSaleValue' }};
function IncentiveSettingsModal({ onClose }: SettingsProps) { /* ... no changes ... */
  const [dailyRule, setDailyRule] = useState<Rule>(defaultRule);
  const [monthlyRule, setMonthlyRule] = useState<Rule>({ ...defaultRule, sales: {...defaultRule.sales, includeProductSale: false }, incentive: {...defaultRule.incentive, applyOn: 'serviceSaleOnly' }});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchRules() {
      setLoading(true);
      try {
        const res = await fetch('/api/incentives/rules');
        const data = await res.json();
        if (res.ok) {
          setDailyRule(data.daily);
          setMonthlyRule(data.monthly);
        } else {
          toast.error(data.message || 'Failed to load rules.');
        }
      } catch (err) {
        toast.error('Network error fetching rules.');
      } finally {
        setLoading(false);
      }
    }
    fetchRules();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
        const res = await fetch('/api/incentives/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daily: dailyRule, monthly: monthlyRule })
        });
        const data = await res.json();
        if(res.ok) {
            toast.success(data.message || 'Rules saved successfully!');
            setTimeout(() => onClose(), 1500);
        } else {
            toast.error(data.message || "An error occurred while saving.");
        }
    } catch (err) {
        toast.error('Network error saving rules.');
    } finally {
        setSaving(false);
    }
  };
  
  const handleRuleChange = (ruleType: 'daily' | 'monthly', path: string, value: any) => {
    const setter = ruleType === 'daily' ? setDailyRule : setMonthlyRule;
    setter(prev => {
        const keys = path.split('.');
        let temp = JSON.parse(JSON.stringify(prev));
        let current = temp as any;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return temp;
    });
  };

  if (loading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 text-white font-bold">Loading Settings...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Manage Incentive Rules</h2>
        <div className="grid md:grid-cols-2 gap-8">
            <RuleEditor title="Incentive 1: Daily Rules" rule={dailyRule} onChange={(path, value) => handleRuleChange('daily', path, value)} />
            <RuleEditor title="Incentive 2: Monthly Rules" rule={monthlyRule} onChange={(path, value) => handleRuleChange('monthly', path, value)} />
        </div>
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <Button onClick={onClose} variant="danger">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} variant="black">{saving ? 'Saving...' : 'Save All Rules'}</Button>
        </div>
      </div>
    </div>
  );
}
const RuleEditor = ({ title, rule, onChange }: { title: string; rule: Rule; onChange: (path: string, value: any) => void; }) => ( /* ... no changes ... */
    <Card title={title}>
        <div className="space-y-4 p-2">
            <div><label className="font-semibold text-gray-700 block mb-1">Target Multiplier (of Salary)</label><input type="number" value={rule.target.multiplier} onChange={(e) => onChange('target.multiplier', Number(e.target.value))} className="w-full p-2 border rounded text-black"/></div>
            <div>
                <label className="font-semibold text-gray-700 block mb-1">Sales to Include for Target</label>
                <div className="flex items-center mt-1"><input type="checkbox" id={`${title}-service`} checked={rule.sales.includeServiceSale} onChange={(e) => onChange('sales.includeServiceSale', e.target.checked)} className="h-4 w-4"/><label htmlFor={`${title}-service`} className="ml-2 text-gray-600">Service Sale</label></div>
                <div className="flex items-center mt-1"><input type="checkbox" id={`${title}-product`} checked={rule.sales.includeProductSale} onChange={(e) => onChange('sales.includeProductSale', e.target.checked)} className="h-4 w-4"/><label htmlFor={`${title}-product`} className="ml-2 text-gray-600">Product Sale</label></div>
            </div>
            <div><label className="font-semibold text-gray-700 block mb-1">Review (Name) Value (₹)</label><input type="number" value={rule.sales.reviewNameValue} onChange={(e) => onChange('sales.reviewNameValue', Number(e.target.value))} className="w-full p-2 border rounded text-black"/></div>
            <div><label className="font-semibold text-gray-700 block mb-1">Review (Photo) Value (₹)</label><input type="number" value={rule.sales.reviewPhotoValue} onChange={(e) => onChange('sales.reviewPhotoValue', Number(e.target.value))} className="w-full p-2 border rounded text-black"/></div>
            <hr/>
            <div><label className="font-semibold text-gray-700 block mb-1">Incentive Rate (e.g., 0.05 for 5%)</label><input type="number" step="0.01" value={rule.incentive.rate} onChange={(e) => onChange('incentive.rate', Number(e.target.value))} className="w-full p-2 border rounded text-black"/></div>
            <div><label className="font-semibold text-gray-700 block mb-1">Double Incentive Rate (e.g., 0.10 for 10%)</label><input type="number" step="0.01" value={rule.incentive.doubleRate} onChange={(e) => onChange('incentive.doubleRate', Number(e.target.value))} className="w-full p-2 border rounded text-black"/></div>
            <div>
                <label className="font-semibold text-gray-700 block mb-1">Apply Incentive On</label>
                 <select value={rule.incentive.applyOn} onChange={(e) => onChange('incentive.applyOn', e.target.value)} className="w-full p-2 border rounded text-black bg-white"><option value="totalSaleValue">Total Sale Value</option><option value="serviceSaleOnly">Service Sale Only</option></select>
            </div>
        </div>
    </Card>
);
interface InputWithIconProps { icon: ReactNode; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; }
const InputWithIcon = ({ icon, ...props }: InputWithIconProps) => ( /* ... no changes ... */
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
      {icon}
    </div>
    <input
      {...props}
      className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
      type={props.type || 'number'}
    />
  </div>
);
const IncentiveResultCard = ({ title, data }: { title: string; data: any }) => { /* ... no changes ... */
    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-300">
                <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500">No data available to calculate.</p>
            </div>
        );
    }
    const isTargetMet = data.isTargetMet;
    const borderColor = isTargetMet ? 'border-green-500' : 'border-red-500';
    const bgColor = isTargetMet ? 'bg-green-50' : 'bg-red-50';
    const textColor = isTargetMet ? 'text-green-700' : 'text-red-700';

    return (
        <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${borderColor}`}>
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                <span className={`flex items-center gap-2 font-semibold text-sm px-3 py-1 rounded-full ${bgColor} ${textColor}`}>
                    {isTargetMet ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {isTargetMet ? 'Target Met' : 'Target Missed'}
                </span>
            </div>
            <div className="space-y-2 text-sm">
                {Object.entries(data).map(([key, value]) => {
                    if (key === 'isTargetMet' || typeof value === 'undefined') return null;
                    const keyFormatted = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const isCurrency = ['incentiveAmount', 'totalSaleValue', 'targetValue', 'serviceSaleValue', 'productSaleValue', 'reviewValue', 'dailyTarget', 'monthlyTarget', 'totalMonthlyServiceSale', 'incentive'].includes(key);
                    return (
                        <div key={key} className="flex justify-between items-center border-t border-gray-100 pt-2">
                            <span className="text-gray-500">{keyFormatted}</span>
                            <span className="font-semibold text-gray-900">{isCurrency ? `₹${Number(value).toFixed(2)}` : String(value)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
interface IncentiveResultsModalProps { isOpen: boolean; onClose: () => void; data: any; }
const IncentiveResultsModal = ({ isOpen, onClose, data }: IncentiveResultsModalProps) => { /* ... no changes ... */
    if (!isOpen || !data) return null;

    const totalIncentive = (data.incentive1_daily?.incentiveAmount || 0) + (data.incentive2_monthly?.incentiveAmount || 0);
    const staffInitials = data.staffName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'FF';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in">
                <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4 rounded-t-xl text-white">
                    <h2 className="text-xl font-bold">Incentive Details</h2>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                            {staffInitials}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-800">{data.staffName}</p>
                            <p className="text-sm text-gray-500">Results for {data.calculationDate}</p>
                        </div>
                    </div>

                    <div className="text-center bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Calculated Incentive</p>
                        <p className="text-4xl font-bold text-green-600 mt-1">₹{totalIncentive.toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <IncentiveResultCard title="Incentive 1: Daily" data={data.incentive1_daily} />
                        <IncentiveResultCard title="Incentive 2: Monthly" data={data.incentive2_monthly} />
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={onClose} variant="danger">Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// MAIN PAGE COMPONENT

export default function IncentivesPage() {
   //  Get session data to check for permissions
  const { data: session } = useSession();
  const userPermissions = useMemo(() => session?.user?.role?.permissions || [], [session]);
  
  // Create a specific permission variable for managing incentives
  const canManageIncentives = useMemo(() => hasPermission(userPermissions, PERMISSIONS.STAFF_INCENTIVES_MANAGE), [userPermissions]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const getMonthRange = () => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    return { firstDay, lastDay };
  };
  const [reportStartDate, setReportStartDate] = useState(getMonthRange().firstDay);
  const [reportEndDate, setReportEndDate] = useState(getMonthRange().lastDay);

  const [serviceSale, setServiceSale] = useState('');
  const [productSale, setProductSale] = useState('');
  const [reviewsWithName, setReviewsWithName] = useState('');
  const [reviewsWithPhoto, setReviewsWithPhoto] = useState('');
  const [customerCount, setCustomerCount] = useState('');

  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  
  const [results, setResults] = useState<any>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoadingStaff(true);
      try {
        const response = await fetch('/api/staff?action=list'); 
        if (!response.ok) {
            toast.error(`Error: Could not load staff. Status: ${response.status}`);
            return;
        }
        const result = await response.json();
        if (result.data && Array.isArray(result.data)) {
          setStaffList(result.data);
          if (result.data.length > 0) setSelectedStaffId(result.data[0].id);
        } else {
          toast.error("Error: Received invalid data for staff list.");
        }
      } catch (error) {
        toast.error('Error: A network or parsing error occurred.');
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []);

  const isValidDateString = (dateStr: any) => {
    return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
        toast.error('Please select a staff member.');
        return;
    }
    setLoading(true);
    try {
        const response = await fetch('/api/incentives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: selectedStaffId, date: logDate,
                serviceSale: Number(serviceSale) || 0,
                productSale: Number(productSale) || 0,
                reviewsWithName: Number(reviewsWithName) || 0,
                reviewsWithPhoto: Number(reviewsWithPhoto) || 0,
                customerCount: Number(customerCount) || 0,
            }),
        });
        const data = await response.json();
        if (response.ok) {
            toast.success(data.message || 'Data logged successfully! You can now recalculate.');
            setServiceSale('');
            setProductSale('');
            setReviewsWithName('');
            setReviewsWithPhoto('');
            setCustomerCount('');
        } else {
            toast.error(data.message || 'An error occurred.');
        }
    } catch (error) {
        toast.error('An error occurred while logging the sale.');
    } finally {
        setLoading(false);
    }
  };

  const handleCalculateIncentive = async () => {
    if (!selectedStaffId) {
        toast.error('Please select a staff member.');
        return;
    }
    if (!isValidDateString(logDate)) {
        toast.error('A valid date must be selected for calculation.');
        return;
    }
    setLoading(true);
    setResults(null); 
    try {
        const response = await fetch(`/api/incentives/${selectedStaffId}?date=${logDate}`);
        const data = await response.json();
        if (response.ok) {
            setResults(data);
            setIsResultsModalOpen(true);
            toast.success('Incentives calculated successfully!');
        } else {
            toast.error(data.message || 'Failed to calculate incentive.');
        }
    } catch (error) {
        toast.error('An error occurred during calculation.');
    } finally {
        setLoading(false);
    }
  };

  const handleResetData = async () => {
    if (!selectedStaffId) {
        toast.error('Please select a staff member to reset data.');
        return;
    }
    if (!isValidDateString(logDate)) {
        toast.error('A valid date must be selected to reset data.');
        return;
    }
    const staffName = staffList.find(s => s.id === selectedStaffId)?.name || 'the selected staff member';
    const isConfirmed = window.confirm(`Are you sure you want to reset all logged sales and reviews for ${staffName} on ${logDate}? This action cannot be undone.`);
    
    if (!isConfirmed) return;

    setLoading(true);
    setResults(null);
    try {
        const response = await fetch('/api/incentives/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: selectedStaffId, date: logDate }),
        });
        const data = await response.json();
        if (response.ok) {
            toast.success(data.message || "Day's data has been reset successfully.");
        } else {
            toast.error(data.message || 'An error occurred during reset.');
        }
    } catch (error) {
        toast.error('A network error occurred while resetting data.');
    } finally {
        setLoading(false);
    }
  };
  
  const validateReportDates = () => {
    if (!isValidDateString(reportStartDate) || !isValidDateString(reportEndDate)) {
        toast.error('Please select a valid start and end date for the report.');
        return false;
    }
    if (new Date(reportStartDate) > new Date(reportEndDate)) {
        toast.error('The report start date cannot be after the end date.');
        return false;
    }
    return true;
  }

  const fetchAllEmployeeReportData = async () => {
    setIsDownloading(true);
    try {
        // MODIFIED: Pointing to the correct API endpoint
        const response = await fetch(`/api/incentives/report/monthly?startDate=${reportStartDate}&endDate=${reportEndDate}`);
        const result = await response.json();
        if (!response.ok) {
            toast.error(result.message || 'Failed to fetch report data.');
            return null;
        }
        return result.data;
    } catch (error) {
        toast.error('A network error occurred while fetching report data.');
        return null;
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    if (!validateReportDates()) return;

    const allData = await fetchAllEmployeeReportData();
    if (!allData || allData.length === 0) {
        toast.info("No data available for the selected date range to generate a report.");
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('All Staff Incentive Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Report Period: ${reportStartDate} to ${reportEndDate}`, 14, 30);

    const tableHead = [
      'Staff Name', 'Daily Target (₹)', 'Daily Achieved (₹)', 'Daily Incentive (₹)', 
      'Monthly Target (₹)', 'Monthly Achieved (₹)', 'Monthly Incentive (₹)', 'Total Incentive (₹)'
    ];
    
    const tableBody = allData.map((emp: any) => {
        const daily = emp.incentive1_daily || {};
        const monthly = emp.incentive2_monthly || {};
        const total = (daily.incentiveAmount || 0) + (monthly.incentiveAmount || 0);
        return [
            emp.staffName,
            (daily.targetValue || 0).toFixed(2),
            (daily.totalSaleValue || 0).toFixed(2),
            (daily.incentiveAmount || 0).toFixed(2),
            (monthly.monthlyTarget || 0).toFixed(2),
            (monthly.totalMonthlyServiceSale || 0).toFixed(2),
            (monthly.incentiveAmount || 0).toFixed(2),
            total.toFixed(2),
        ];
    });

    autoTable(doc, {
        head: [tableHead],
        body: tableBody,
        startY: 35,
        theme: 'grid',
    });

    doc.save(`Incentive_Report_${reportStartDate}_to_${reportEndDate}.pdf`);
  };

  const handleDownloadAllExcel = async () => {
    if (!validateReportDates()) return;

    const allData = await fetchAllEmployeeReportData();
    if (!allData || allData.length === 0) {
        toast.info("No data available for the selected date range to generate a report.");
        return;
    }

    const reportData = allData.map((emp: any) => {
        const daily = emp.incentive1_daily || {};
        const monthly = emp.incentive2_monthly || {};
        const total = (daily.incentiveAmount || 0) + (monthly.incentiveAmount || 0);
        return {
            'Staff Name': emp.staffName,
            'Daily Target (₹)': daily.targetValue || 0,
            'Daily Achieved (₹)': daily.totalSaleValue || 0,
            'Daily Incentive (₹)': daily.incentiveAmount || 0,
            'Monthly Target (₹)': monthly.monthlyTarget || 0,
            'Monthly Achieved (₹)': monthly.totalMonthlyServiceSale || 0,
            'Monthly Incentive (₹)': monthly.incentiveAmount || 0,
            'Total Incentive (₹)': total,
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incentive Report');
    XLSX.writeFile(workbook, `Incentive_Report_${reportStartDate}_to_${reportEndDate}.xlsx`);
  };


  return (
    <div className="bg-gray-50 min-h-screen">
      {isSettingsModalOpen && <IncentiveSettingsModal onClose={() => setIsSettingsModalOpen(false)} />}
      
      <IncentiveResultsModal 
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        data={results}
      />
      
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Incentives Dashboard</h1>
            <p className="text-gray-500 mt-1">Log daily performance and calculate staff incentives.</p>
          </div>
          {canManageIncentives && (
            <Button onClick={() => setIsSettingsModalOpen(true)} variant="outline" className="flex items-center gap-2">
              <Settings size={16} /> Manage Rules
            </Button>
          )}
        </div>
        
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Context for Individual Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select value={selectedStaffId} onChange={(e) => {setSelectedStaffId(e.target.value); setResults(null);}} className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black" disabled={loadingStaff || staffList.length === 0}>
                  {loadingStaff ? <option>Loading Staff...</option> : staffList.length === 0 ? <option>No staff found</option> : staffList.map((staff) => (<option key={staff.id} value={staff.id}>{staff.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={logDate} onChange={(e) => {setLogDate(e.target.value); setResults(null);}} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black" />
              </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <Card>
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Log Performance</h2>
              <form onSubmit={handleLogSale} className="space-y-4">
                  <InputWithIcon icon={<Users size={18} />} placeholder="Number of Customers" value={customerCount} onChange={e => setCustomerCount(e.target.value)} required />
                  <InputWithIcon icon={<Truck size={18} />} placeholder="Service Sale (₹)" value={serviceSale} onChange={e => setServiceSale(e.target.value)} />
                  <InputWithIcon icon={<ShoppingBag size={18} />} placeholder="Product Sale (₹)" value={productSale} onChange={e => setProductSale(e.target.value)} />
                  <InputWithIcon icon={<Star size={18} />} placeholder="Reviews (Name Only)" value={reviewsWithName} onChange={e => setReviewsWithName(e.target.value)} />
                  <InputWithIcon icon={<Gift size={18} />} placeholder="Reviews (with Photo)" value={reviewsWithPhoto} onChange={e => setReviewsWithPhoto(e.target.value)} />
                 {canManageIncentives && (
                    <Button type="submit" disabled={loading || !selectedStaffId} className="w-full flex items-center justify-center gap-2" variant="black">
                        <PlusCircle size={18} />
                        {loading ? 'Logging...' : 'Log Data'}
                    </Button>
                  )}
              </form>
          </Card>
          
          <div className="space-y-8">
            <Card>
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Individual Actions & Results</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={handleCalculateIncentive} disabled={loading || !selectedStaffId} className="w-full" variant="black">
                        {loading ? 'Calculating...' : 'Calculate Individual'}
                    </Button>
                    {canManageIncentives && (
                      <Button onClick={handleResetData} disabled={loading || !selectedStaffId} className="w-full flex items-center justify-center gap-2" variant="danger">
                          <RefreshCcw size={16} />
                          {loading ? 'Resetting...' : "Reset Day's Data"}
                      </Button>
                    )}
                </div>
                <div className="mt-6 bg-gray-100 p-6 rounded-lg min-h-[150px] flex flex-col justify-center">
                    <div className="text-center text-gray-400">
                        <BarChartBig size={48} className="mx-auto mb-4" />
                        <h3 className="font-semibold text-lg text-gray-600">Individual results pop-up here</h3>
                        <p className="text-sm">Click 'Calculate Individual' to see details.</p>
                    </div>
                </div>
            </Card>
            
            <Card>
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">Download Bulk Reports</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black" />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <Button onClick={handleDownloadAllPdf} disabled={isDownloading} className="flex items-center justify-center gap-2" variant="outline">
                         <Download size={16} />
                         {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                      </Button>
                      <Button onClick={handleDownloadAllExcel} disabled={isDownloading} className="flex items-center justify-center gap-2" variant="outline">
                         <Download size={16} />
                         {isDownloading ? 'Generating Excel...' : 'Download Excel'}
                      </Button>
                  </div>
                </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}