'use client';

import React, { useState, useEffect, useMemo } from 'react';
// --- All necessary imports, including for export functionality ---
import { createPortal } from 'react-dom'; // **FIX: Import createPortal**
import { Search, Star, TrendingUp, Users, IndianRupee, X, CalendarDays, Sheet, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Interface for main performance data (assuming backend provides this)
interface PerformanceData {
    staffId: string;
    staffIdNumber: string;
    name: string;
    position: string;
    image?: string;
    sales: number;
    customers: number;
    rating: number;
    totalServiceSales: number;
    totalProductSales: number;
}

interface SummaryData {
    averageRating: string;
    totalCustomers: number;
    revenueGenerated: number;
    avgServiceQuality: string;
}
interface DailyPerformanceRecord {
  date: string;
  serviceSales: number;
  productSales: number;
  customersServed: number;
  rating: number;
}

// --- UI Components (Unchanged) ---
const SummaryCardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center">
      <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
      <div className="space-y-2 flex-1">
        <div className="h-6 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  </div>
);

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  iconBgColor: string;
  bgIconColor: string;
}> = ({ icon, title, value, iconBgColor, bgIconColor }) => (
  <div className="relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
    <div className={`absolute -right-4 -bottom-5 ${bgIconColor} opacity-70`}>
      {React.cloneElement(icon as React.ReactElement, { size: 96, strokeWidth: 1 })}
    </div>
    <div className="relative z-10">
      <div className={`p-3 rounded-lg inline-block ${iconBgColor}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <p className="mt-4 text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// --- **FIX: New Portal Component to handle modal rendering** ---
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Render the modal into document.body, but only on the client-side
  return mounted ? createPortal(children, document.body) : null;
};

// --- Main Performance Page Component ---
const PerformancePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<PerformanceData | null>(null);
  const [staffDailyPerformance, setStaffDailyPerformance] = useState<DailyPerformanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const months = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);

  const today = new Date();
  const reportDate = format(today, 'dd-MM-yyyy');
  const isViewingCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonthIndex;
  const daysInSelectedMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const daysEnded = isViewingCurrentMonth ? today.getDate() : daysInSelectedMonth;
  const projectionDays = daysInSelectedMonth;

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const month = currentMonthIndex + 1;
        const response = await fetch(`/api/performance?month=${month}&year=${currentYear}`);
        if (!response.ok) throw new Error('Failed to fetch monthly performance data');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'API returned an error');
        setSummaryData(data.summary);
        const enrichedData = data.staffPerformance.map((staff: any) => ({
            ...staff,
            totalServiceSales: staff.totalServiceSales || 0,
            totalProductSales: staff.totalProductSales || 0,
        }));
        setPerformanceData(enrichedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPerformanceData();
  }, [currentMonthIndex, currentYear]);

  const filteredStaffPerformance = useMemo(() => 
    performanceData.filter((staff: PerformanceData) => 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [performanceData, searchTerm]);

  const grandTotals = useMemo(() => {
    const totalSales = filteredStaffPerformance.reduce((sum, s) => sum + s.sales, 0);
    const totalClients = filteredStaffPerformance.reduce((sum, s) => sum + s.customers, 0);
    const totalServiceSales = filteredStaffPerformance.reduce((sum, s) => sum + s.totalServiceSales, 0);
    const totalProductSales = filteredStaffPerformance.reduce((sum, s) => sum + s.totalProductSales, 0);
    const avgAbv = totalClients > 0 ? totalSales / totalClients : 0;
    const projectedSales = daysEnded > 0 ? (totalSales / daysEnded) * projectionDays : 0;
    const projectedClients = daysEnded > 0 ? (totalClients / daysEnded) * projectionDays : 0;
    return { totalSales, totalClients, avgAbv, projectedSales, projectedClients, totalServiceSales, totalProductSales };
  }, [filteredStaffPerformance, daysEnded, projectionDays]);

  const handleOpenDetails = async (staff: PerformanceData) => {
    setSelectedStaff(staff);
    setIsLoadingDetails(true);
    setErrorDetails(null);
    setStaffDailyPerformance([]);
    try {
      const month = currentMonthIndex + 1;
      const response = await fetch(`/api/performance?staffId=${staff.staffId}&month=${month}&year=${currentYear}`);
      if (!response.ok) throw new Error('Could not fetch daily details.');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'API returned an error fetching details.');
      setStaffDailyPerformance(data.details || []);
    } catch (err: any) {
      setErrorDetails(err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  const handleCloseDetails = () => setSelectedStaff(null);
  
  const panelSummary = useMemo(() => {
    if (!staffDailyPerformance || staffDailyPerformance.length === 0) return { totalSales: 0, totalCustomers: 0, averageRating: 0 };
    const totalSales = staffDailyPerformance.reduce((sum, day) => sum + day.serviceSales + day.productSales, 0);
    const totalCustomers = staffDailyPerformance.reduce((sum, day) => sum + day.customersServed, 0);
    const validRatings = staffDailyPerformance.filter(day => day.rating > 0);
    const averageRating = validRatings.length > 0 ? validRatings.reduce((sum, day) => sum + day.rating, 0) / validRatings.length : 0;
    return { totalSales, totalCustomers, averageRating };
  }, [staffDailyPerformance]);
  
  const ratingRing = useMemo(() => {
    if (!selectedStaff) return { circumference: 0, offset: 0 };
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (selectedStaff.rating / 10) * circumference;
    return { circumference, offset };
  }, [selectedStaff]);

  const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
  
  const yearOptions = useMemo(() => {
    const endYear = new Date().getFullYear();
    const startYear = 2020;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);
  }, []);

  const getExportData = () => {
    const headers = [
        "S.NO", "employee name", "employee code", "client count", "ABV",
        "service net sales", "product sales", "total sales", 
        "total sales heading to", "No of Clients Heading To"
    ];

    const body = filteredStaffPerformance.map((staff, index) => {
      const abv = staff.customers > 0 ? staff.sales / staff.customers : 0;
      const projectedSales = daysEnded > 0 ? (staff.sales / daysEnded) * projectionDays : 0;
      const projectedClients = daysEnded > 0 ? (staff.customers / daysEnded) * projectionDays : 0;
      
      return [
        index + 1,
        staff.name,
        staff.staffIdNumber,
        staff.customers,
        Math.round(abv),
        staff.totalServiceSales,
        staff.totalProductSales,
        staff.sales,
        Math.round(projectedSales),
        Math.round(projectedClients)
      ];
    });

    const totalsRow = [
      "", "GRAND TOTAL", "", grandTotals.totalClients, Math.round(grandTotals.avgAbv),
      grandTotals.totalServiceSales, grandTotals.totalProductSales, Math.round(grandTotals.totalSales),
      Math.round(grandTotals.projectedSales), Math.round(grandTotals.projectedClients)
    ];

    return { headers, body, totalsRow };
  };

  const handleDownloadExcel = () => {
    const { headers, body, totalsRow } = getExportData();
    const worksheetData = [headers, ...body, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [
        { wch: 5 },  { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Report");
    XLSX.writeFile(wb, `Performance_Report_${months[currentMonthIndex]}_${currentYear}.xlsx`);
  };

  const handleDownloadPdf = () => {
    const { headers, body, totalsRow } = getExportData();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text(`Performance Report - ${months[currentMonthIndex]} ${currentYear}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report generated on: ${format(new Date(), 'dd-MM-yyyy')}`, 14, 26);
    autoTable(doc, {
        head: [headers], body: body, foot: [totalsRow], startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], fontSize: 8 },
        footStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save(`Performance_Report_${months[currentMonthIndex]}_${currentYear}.pdf`);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">An overview for {months[currentMonthIndex]} {currentYear}.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <select id="month-select" value={currentMonthIndex} onChange={(e) => setCurrentMonthIndex(Number(e.target.value))} className="bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Select month">
              {months.map((month, index) => (<option key={index} value={index}>{month}</option>))}
            </select>
            <select id="year-select" value={currentYear} onChange={(e) => setCurrentYear(Number(e.target.value))} className="bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Select year">
              {yearOptions.map(year => (<option key={year} value={year}>{year}</option>))}
            </select>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full bg-white pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder:text-gray-400"/>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPdf} className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors" title="Download as PDF">
              <FileDown size={16} />
              <span>PDF</span>
            </button>
            <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors" title="Download as Excel">
              <Sheet size={16} />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? <><SummaryCardSkeleton /><SummaryCardSkeleton /><SummaryCardSkeleton /><SummaryCardSkeleton /></> : 
         error ? <div className="col-span-full text-center p-10 bg-white rounded-xl shadow-sm text-red-500">{error}</div> :
          <>
            <SummaryCard icon={<Star className="text-amber-600" />} title="Average Rating" value={summaryData?.averageRating || '0.0'} iconBgColor="bg-amber-100" bgIconColor="text-amber-100"/>
            <SummaryCard icon={<Users className="text-teal-600" />} title="Total Customers" value={summaryData?.totalCustomers || 0} iconBgColor="bg-teal-100" bgIconColor="text-teal-100"/>
            <SummaryCard icon={<IndianRupee className="text-green-600" />} title="Revenue Generated" value={`₹${summaryData?.revenueGenerated.toLocaleString() || 0}`} iconBgColor="bg-green-100" bgIconColor="text-green-100"/>
            <SummaryCard icon={<TrendingUp className="text-indigo-600" />} title="Avg Service Quality" value={summaryData?.avgServiceQuality || '0.0'} iconBgColor="bg-indigo-100" bgIconColor="text-indigo-100"/>
          </>
        }
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-200 text-center">
            <div className="text-lg sm:text-xl font-bold text-gray-800 uppercase tracking-wider">Staff Service Sales and ABV Report</div>
            <div className="flex items-center justify-center gap-4 mt-3">
                <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Date: {reportDate}</span>
                <span className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Days Ended: {daysEnded}</span>
            </div>
        </div>
        <div className="hidden md:block p-4 space-y-2">
            <div className="flex items-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 rounded-lg">
                <div className="w-[4%] text-center">S.NO</div>
                <div className="w-[8%] text-center">STAFF ID</div>
                <div className="w-[15%]">Staff Name</div>
                <div className="w-[12%] text-right">Total Sales</div>
                <div className="w-[11%] text-center">No of Clients</div>
                <div className="w-[12%] text-right">ABV</div>
                <div className="w-[19%] text-center">Total Sales Heading To</div>
                <div className="w-[19%] text-center">No of Clients Heading To</div>
            </div>
            {isLoading ? (<div className="text-center p-10 text-gray-500">Loading...</div>) : 
             error ? (<div className="text-center p-10 text-red-500">{error}</div>) :
             (<>
                {filteredStaffPerformance.map((staff, index) => {
                    const abv = staff.customers > 0 ? staff.sales / staff.customers : 0;
                    const projectedSales = daysEnded > 0 ? (staff.sales / daysEnded) * projectionDays : 0;
                    const projectedClients = daysEnded > 0 ? (staff.customers / daysEnded) * projectionDays : 0;
                    return (
                        <div key={staff.staffId} onClick={() => handleOpenDetails(staff)} className="flex items-center p-4 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                            <div className="w-[4%] text-sm font-medium text-gray-500 text-center">{index + 1}.</div>
                            <div className="w-[8%] text-sm font-semibold text-gray-600 text-center">{staff.staffIdNumber}</div>
                            <div className="w-[15%] text-sm font-semibold text-gray-800">{staff.name}</div>
                            <div className="w-[12%] text-sm text-gray-700 text-right">{formatCurrency(staff.sales)}</div>
                            <div className="w-[11%] text-sm text-gray-700 text-center">{staff.customers}</div>
                            <div className="w-[12%] text-sm text-indigo-600 font-bold text-right">{formatCurrency(abv)}</div>
                            <div className="w-[19%] text-center"><span className="inline-flex w-28 justify-center items-center py-1 px-2.5 rounded-full text-xs font-bold bg-green-100 text-green-800">{formatCurrency(projectedSales)}</span></div>
                            <div className="w-[19%] text-center"><span className="inline-flex w-28 justify-center items-center py-1 px-2.5 rounded-full text-xs font-bold bg-green-100 text-green-800">{Math.round(projectedClients)}</span></div>
                        </div>
                    );
                })}
                <div className="flex items-center p-4 mt-2 font-bold text-gray-800 bg-slate-100 rounded-lg border-t-2 border-slate-200">
                    <div className="w-[4%]"></div>
                    <div className="w-[8%]"></div>
                    <div className="w-[15%] text-sm uppercase tracking-wider">Grand Total</div>
                    <div className="w-[12%] text-sm text-right">{formatCurrency(grandTotals.totalSales)}</div>
                    <div className="w-[11%] text-sm text-center">{grandTotals.totalClients}</div>
                    <div className="w-[12%] text-sm text-right text-indigo-700">{formatCurrency(grandTotals.avgAbv)}</div>
                    <div className="w-[19%] text-sm text-center">{formatCurrency(grandTotals.projectedSales)}</div>
                    <div className="w-[19%] text-sm text-center">{Math.round(grandTotals.projectedClients)}</div>
                </div>
             </>)
            }
        </div>
        <div className="block md:hidden p-4 space-y-4"></div>
        <div className="p-3 text-xs text-center text-gray-600 bg-slate-50 rounded-b-lg border-t border-gray-200 uppercase">
            TOTAL SALES HEADING TO MEANS THE ESTIMATED SALES YOU ARE GOING TO REACH BY THE END OF THE MONTH...
        </div>
      </div>
      
      {/* **FIX: Wrap modal in the Portal component** */}
      {selectedStaff && (
        <ModalPortal>
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 transition-opacity duration-300"
              onClick={handleCloseDetails}
            >
              <div 
                className="relative w-full max-w-2xl max-h-[90vh] bg-gray-50 rounded-2xl shadow-xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 bg-white rounded-t-2xl">
                  <h2 className="text-lg font-semibold text-gray-800">Performance Details</h2>
                  <button onClick={handleCloseDetails} className="p-1 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
                    <X size={24} />
                  </button>
                </header>
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto">
                    <div className="space-y-6">
                        <div className="relative flex flex-col sm:flex-row items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="relative w-24 h-24 flex-shrink-0">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="38" cx="50" cy="50" />
                                        <circle className="text-amber-500" strokeWidth="8" strokeDasharray={ratingRing.circumference} strokeDashoffset={ratingRing.offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="38" cx="50" cy="50" style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }} transform="rotate(-90 50 50)" />
                                    </svg>
                                    <img className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full object-cover" src={selectedStaff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff.name)}&background=random&color=fff`} alt={selectedStaff.name} />
                            </div>
                            <div className="ml-0 sm:ml-5 mt-4 sm:mt-0 text-center sm:text-left">
                                <h3 className="text-xl font-bold text-gray-900">{selectedStaff.name}</h3>
                                <p className="text-sm text-gray-600">{selectedStaff.position}</p>
                                <div className="mt-2 flex items-center justify-center sm:justify-start text-lg font-bold text-amber-600">
                                    <Star className="w-5 h-5 mr-1.5 fill-current" />
                                    <span>{selectedStaff.rating.toFixed(1)} <span className="text-sm font-medium text-gray-500">/ 10 (Monthly)</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Summary for {months[currentMonthIndex]}</h4>
                            {isLoadingDetails ? (<div className="text-center py-4 text-gray-500">Loading...</div>) : 
                            errorDetails ? (<div className="text-center py-4 text-red-500">{errorDetails}</div>) :
                            (<div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                <div><p className="text-md sm:text-lg font-bold text-green-600">₹{panelSummary.totalSales.toLocaleString()}</p><p className="text-xs text-gray-500">Total Sales</p></div>
                                <div><p className="text-md sm:text-lg font-bold text-teal-600">{panelSummary.totalCustomers}</p><p className="text-xs text-gray-500">Customers</p></div>
                                <div><p className="text-md sm:text-lg font-bold text-amber-600">{panelSummary.averageRating.toFixed(1)}</p><p className="text-xs text-gray-500">Avg Rating</p></div>
                            </div>)
                            }
                        </div>
                        <div>
                            <h4 className="text-md font-semibold text-gray-800 mb-3 px-1">Daily Breakdown</h4>
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                                {isLoadingDetails ? (<div className="text-center py-10 text-gray-500">Loading records...</div>) :
                                errorDetails ? (<div className="text-center py-10 text-red-500">{errorDetails}</div>) :
                                staffDailyPerformance.length > 0 ? (
                                <div className="space-y-2">
                                    {staffDailyPerformance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((day) => {
                                        const dailyTotalSales = day.serviceSales + day.productSales;
                                        const dailyAbv = day.customersServed > 0 ? Math.round(dailyTotalSales / day.customersServed) : 0;
                                        return (
                                            <div key={day.date} className="p-3 rounded-lg hover:bg-gray-50 border-b border-gray-200 last:border-b-0">
                                                <div className="font-semibold text-gray-800 flex items-center text-sm mb-3">
                                                    <CalendarDays className="w-4 h-4 mr-2 text-indigo-500" />
                                                    {format(parseISO(day.date), 'dd MMM, yyyy')}
                                                </div>
                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                                                    <div className="p-2 rounded-md bg-blue-50 text-blue-800"><p className="font-bold">₹{day.serviceSales.toLocaleString()}</p><p className="text-[10px] uppercase">Service</p></div>
                                                    <div className="p-2 rounded-md bg-purple-50 text-purple-800"><p className="font-bold">₹{day.productSales.toLocaleString()}</p><p className="text-[10px] uppercase">Product</p></div>
                                                    <div className="p-2 rounded-md bg-teal-50 text-teal-800"><p className="font-bold">{day.customersServed}</p><p className="text-[10px] uppercase">Clients</p></div>
                                                    <div className="p-2 rounded-md bg-indigo-50 text-indigo-800"><p className="font-bold">₹{dailyAbv.toLocaleString()}</p><p className="text-[10px] uppercase">ABV</p></div>
                                                    <div className="p-2 rounded-md bg-amber-50 text-amber-800 col-span-3 sm:col-span-1"><p className="font-bold">{day.rating.toFixed(1)} / 10</p><p className="text-[10px] uppercase">Rating</p></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                ) : ( <p className="text-sm text-gray-500 text-center py-10">No daily records found for this month.</p> )}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PerformancePage;