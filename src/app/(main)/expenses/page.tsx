'use client';

import { useState, useEffect, FormEvent, useMemo, Fragment } from 'react';

// --- IMPORTS FOR UI & MODAL ---
import {
  PlusCircleIcon,
  DocumentChartBarIcon,
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ArrowUpCircleIcon,
  TagIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';

// --- IMPORTS FOR NOTIFICATIONS ---
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- IMPORTS FOR PDF & EXCEL EXPORT ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// --- INTERFACES ---
interface IExpense {
  _id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
}

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  historyData: IExpense[];
}

function ExpenseDetailsModal({ isOpen, onClose, title, historyData }: ExpenseDetailsModalProps) {
  const modalTotal = historyData.reduce((sum, expense) => sum + expense.amount, 0);

  // PDF Download Handler
  const handlePdfDownload = () => {
    const doc = new jsPDF();
    
    const reportTitle = `Expenses Report - ${title}`;
    doc.text(reportTitle, 14, 22);

    const tableColumn = ["Date", "Type", "Description", "Time", "Amount"];
    const tableRows: (string | number)[][] = [];

    historyData.forEach(expense => {
      const expenseData = [
        new Date(expense.date).toLocaleDateString('en-GB'),
        expense.type,
        expense.description || 'N/A',
        new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        `₹${expense.amount.toFixed(2)}`
      ];
      tableRows.push(expenseData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [34, 41, 47] },
      foot: [
        [
            { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `₹${modalTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]
      ],
      footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });
    
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_expenses_report.pdf`;
    doc.save(fileName);
  };

  // CSV Download Handler
  const handleCsvDownload = () => {
    const reportTitle = `Expenses Report - ${title}`;
    const escapedTitle = `"${reportTitle.replace(/"/g, '""')}"\r\n\r\n`;

    const tableColumn = ["Date", "Type", "Description", "Time", "Amount"];
    const escapeCsvCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

    let csvContent = escapedTitle;
    csvContent += tableColumn.join(',') + '\r\n';

    historyData.forEach(expense => {
      const formattedDate = `'${new Date(expense.date).toLocaleDateString('en-GB')}`;

      const row = [
        formattedDate,
        expense.type,
        escapeCsvCell(expense.description || 'N/A'),
        new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        expense.amount.toFixed(2)
      ].join(',');
      csvContent += row + '\r\n';
    });
    
    csvContent += `\r\n,,,Total,${modalTotal.toFixed(2)}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_expenses_report.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border-t-4 border-gray-800">
                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <DocumentChartBarIcon className="h-7 w-7 text-gray-700"/>
                    <div>
                      <span className="block text-gray-600 font-normal">{title}</span>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                    <XMarkIcon className="h-6 w-6 text-gray-600" />
                  </button>
                </Dialog.Title>
                <div className="mt-6">
                  <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 [&>*:nth-child(even)]:bg-slate-50">
                        {historyData.map(expense => (
                          <tr key={expense._id} className="hover:bg-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(expense.date).toLocaleDateString('en-GB')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{expense.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.description || <span className="text-gray-400">N/A</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">₹{expense.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                       <tfoot className="bg-gray-100 sticky bottom-0 border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-800 uppercase">Total</td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">₹{modalTotal.toFixed(2)}</td>
                          </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-end items-center gap-3">
                    <button onClick={handleCsvDownload} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export to Excel (CSV)
                    </button>
                    <button onClick={handlePdfDownload} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 transition-colors">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download PDF
                    </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


// --- MAIN PAGE COMPONENT ---
export default function ExpensesPage() {
  const [allExpenses, setAllExpenses] = useState<IExpense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>(['Tea', 'Coffee', 'Snacks', 'General']);
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Form State
  const [type, setType] = useState(expenseTypes[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseTime, setExpenseTime] = useState(getCurrentTime());
  
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState('');
  const [typeError, setTypeError] = useState<string | null>(null);

  // Filtering State
  const [filterType, setFilterType] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<{ title: string, data: IExpense[] }>({ title: '', data: [] });

  // State to manage history view (Daily, Weekly, Monthly)
  const [historyView, setHistoryView] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');


  useEffect(() => { fetchExpenses() }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setAllExpenses(data.data);
      const fetchedTypesFromServer = data.data.map((exp: IExpense) => exp.type);
      setExpenseTypes(prev => Array.from(new Set<string>([...prev, ...fetchedTypesFromServer])));
    } catch (err) {
      toast.error("Could not fetch expense data.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const todayStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= todayStart && expenseDate <= todayEnd;
    });

    const totalSpent = todaysExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseCount = todaysExpenses.length;
    const highestExpense = todaysExpenses.reduce((max, exp) => exp.amount > max ? exp.amount : max, 0);

    let mostCommonType = 'N/A';
    if (todaysExpenses.length > 0) {
        const typeCounts = todaysExpenses.reduce((acc, exp) => {
            acc[exp.type] = (acc[exp.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        mostCommonType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
    }

    return { totalSpent, expenseCount, highestExpense, mostCommonType };
  }, [allExpenses]);


  const filteredExpenses = useMemo(() => {
    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);

      const typeMatch = filterType === 'all' || expense.type === filterType;
      const startDateMatch = !start || expenseDate >= start;
      const endDateMatch = !end || expenseDate <= end;
      return typeMatch && startDateMatch && endDateMatch;
    });
  }, [allExpenses, filterType, filterStartDate, filterEndDate]);


  const groupedAndSortedExpenses = useMemo(() => {
    const groupedByDate = filteredExpenses.reduce((acc, expense) => {
      const dateKey = new Date(expense.date).toDateString();
      if (!acc[dateKey]) acc[dateKey] = { total: 0, count: 0, records: [] };
      acc[dateKey].total += expense.amount;
      acc[dateKey].count += 1;
      acc[dateKey].records.push(expense);
      return acc;
    }, {} as Record<string, { total: number, count: number, records: IExpense[] }>);
    return Object.entries(groupedByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  const weeklyGroupedExpenses = useMemo(() => {
    const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const startOfWeek = new Date(date.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    };
    
    const groupedByWeek = filteredExpenses.reduce((acc, expense) => {
      const weekStart = getStartOfWeek(new Date(expense.date));
      const weekKey = weekStart.toISOString();
      if (!acc[weekKey]) acc[weekKey] = { total: 0, count: 0, records: [] };
      acc[weekKey].total += expense.amount;
      acc[weekKey].count += 1;
      acc[weekKey].records.push(expense);
      return acc;
    }, {} as Record<string, { total: number, count: number, records: IExpense[] }>);

    return Object.entries(groupedByWeek).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);
  
  const monthlyGroupedExpenses = useMemo(() => {
    const groupedByMonth = filteredExpenses.reduce((acc, expense) => {
      const expenseDate = new Date(expense.date);
      const monthStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1);
      const monthKey = monthStart.toISOString();
      if (!acc[monthKey]) acc[monthKey] = { total: 0, count: 0, records: [] };
      acc[monthKey].total += expense.amount;
      acc[monthKey].count += 1;
      acc[monthKey].records.push(expense);
      return acc;
    }, {} as Record<string, { total: number, count: number, records: IExpense[] }>);

    return Object.entries(groupedByMonth).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!type || !amount || !expenseDate || !expenseTime) {
      toast.warn("Please fill all required fields.");
      return;
    }
    
    const submissionDate = new Date(`${expenseDate}T${expenseTime}`);

    try {
      const res = await fetch('/api/expenses', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ type, description, amount: parseFloat(amount), date: submissionDate.toISOString() }) 
      });

      if (!res.ok) throw new Error("Submission failed");

      toast.success("Expense added successfully!");

      setDescription(''); 
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseTime(getCurrentTime());
      await fetchExpenses();
    } catch (err) { 
      toast.error("Failed to add expense. Please try again.");
    }
  };
  
  const handleAddType = () => {
    setTypeError(null);
    const trimmedNewType = newType.trim();
    if (!trimmedNewType) { setTypeError("New type name cannot be empty."); return; }
    if (expenseTypes.some(t => t.toLowerCase() === trimmedNewType.toLowerCase())) { setTypeError(`Type "${trimmedNewType}" already exists.`); return; }
    const updatedTypes = [...expenseTypes, trimmedNewType];
    setExpenseTypes(updatedTypes);
    setType(trimmedNewType);
    setNewType('');
    setShowAddType(false);
  };

  const handleViewHistory = (title: string, records: IExpense[]) => {
    setSelectedHistory({ title, data: records });
    setIsModalOpen(true);
  };
  
  const getHistoryItemTitle = (dateString: string, view: typeof historyView) => {
      const date = new Date(dateString);
      if (view === 'Daily') {
          return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      }
      if (view === 'Weekly') {
          const endOfWeek = new Date(date);
          endOfWeek.setDate(date.getDate() + 6);
          const startStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const endStr = endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return `Week of ${startStr} - ${endStr}`;
      }
      if (view === 'Monthly') {
          return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
      return '';
  };
  
  const dataToRender = {
    'Daily': groupedAndSortedExpenses,
    'Weekly': weeklyGroupedExpenses,
    'Monthly': monthlyGroupedExpenses,
  }[historyView];


  return (
    <div className="bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light"/>

      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Expense Dashboard</h1>
              <p className="text-gray-500 mt-1">Today's expense summary and history.</p>
            </div>
            <div className="flex items-center gap-4">
                <select id="filterType" value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full sm:w-auto bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="all">All Types</option>
                    {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="date" id="filterStartDate" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full sm:w-auto bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="date" id="filterEndDate" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full sm:w-auto bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 p-5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/20"></div>
                <BanknotesIcon className="absolute top-4 right-4 h-8 w-8 text-white/50" />
                <p className="text-sm font-medium text-rose-100">Total Spent Today</p>
                <p className="mt-2 text-3xl font-bold">₹{todayStats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 p-5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out delay-150">
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/20"></div>
                <ClipboardDocumentListIcon className="absolute top-4 right-4 h-8 w-8 text-white/50" />
                <p className="text-sm font-medium text-cyan-100">Number of Expenses</p>
                <p className="mt-2 text-3xl font-bold">{todayStats.expenseCount}</p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out delay-300">
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/20"></div>
                <ArrowUpCircleIcon className="absolute top-4 right-4 h-8 w-8 text-white/50" />
                <p className="text-sm font-medium text-indigo-100">Highest Expense</p>
                <p className="mt-2 text-3xl font-bold">₹{todayStats.highestExpense.toFixed(2)}</p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out delay-[450ms]">
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/20"></div>
                <TagIcon className="absolute top-4 right-4 h-8 w-8 text-white/50" />
                <p className="text-sm font-medium text-orange-100">Most Common Type</p>
                <p className="mt-2 text-3xl font-bold truncate">{todayStats.mostCommonType}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                  <PlusCircleIcon className="h-6 w-6 mr-2 text-gray-500" /> Add New Expense
                </h2>
                <button type="button" onClick={() => setShowAddType(!showAddType)} className="bg-gray-800 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-900 text-sm transition-colors">
                  {showAddType ? 'Cancel' : 'Add New Type'}
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
                 <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-600">Expense Type</label>
                    <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500">
                      {expenseTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 
                 {showAddType && (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 animate-in fade-in duration-300">
                       <div className="flex items-center space-x-2">
                          <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New type name" className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-sm"/>
                          <button type="button" onClick={handleAddType} className="flex-shrink-0 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 text-sm font-medium">Add</button>
                          <button type="button" onClick={() => setShowAddType(false)} className="flex-shrink-0 p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                       </div>
                       {typeError && <p className="mt-2 text-sm text-red-500">{typeError}</p>}
                    </div>
                 )}
                 
                 <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-600">Amount</label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full rounded-md border-gray-300 py-2 pl-7 pr-2 shadow-sm focus:border-gray-500 focus:ring-gray-500" required placeholder="1250.50" step="0.01"/>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-600">Date</label>
                        <input id="expenseDate" type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                     <div>
                        <label htmlFor="expenseTime" className="block text-sm font-medium text-gray-600">Time</label>
                        <input id="expenseTime" type="time" value={expenseTime} onChange={e => setExpenseTime(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                 </div>

                 <div className="flex-grow">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-600">Description (Optional)</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Lunch meeting with client"></textarea>
                 </div>
                 <button type="submit" className="w-full bg-gray-800 text-white py-2.5 px-4 rounded-md hover:bg-gray-900 font-semibold transition-colors mt-auto">Submit Expense</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Expense History</h2>
              
              <div className="flex w-full space-x-1 rounded-lg bg-gray-200 p-1 mb-4">
                {(['Daily', 'Weekly', 'Monthly'] as const).map(view => (
                    <button 
                        key={view} 
                        onClick={() => setHistoryView(view)} 
                        className={`w-full rounded-md py-1.5 text-sm font-medium leading-5 transition-colors focus:outline-none 
                            ${historyView === view ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-white/50'}`
                        }
                    >
                        {view}
                    </button>
                ))}
              </div>

              {/* === THIS IS THE NEW, FIXED CODE === */}
              {/* Wrapper to create a positioning context and take up remaining space */}
              <div className="relative flex-grow">
                {/* The actual scrollable element, positioned to fill the wrapper */}
                <div className="absolute inset-0 overflow-y-auto pr-2">
                  {isLoading && <p className="p-4">Loading history...</p>}
                  {!isLoading && (
                    <div className="space-y-4">
                      {dataToRender.length > 0 ? (
                        dataToRender.map(([dateString, data]) => {
                          const title = getHistoryItemTitle(dateString, historyView);
                          return (
                            <div key={dateString} className="p-4 border rounded-lg flex items-center justify-between bg-gray-50 hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg"><CalendarDaysIcon className="h-6 w-6 text-gray-600" /></div>
                                <div>
                                  <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                                  <p className="text-sm text-gray-500">{data.count} records found. Total spent: <span className="font-semibold text-gray-600">₹{data.total.toFixed(2)}</span></p>
                                </div>
                              </div>
                              <button onClick={() => handleViewHistory(title, data.records)} className="bg-gray-800 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-900 text-sm transition-colors">View Details</button>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg h-full flex flex-col justify-center">
                            <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or add a new expense.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>

      <ExpenseDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedHistory.title} historyData={selectedHistory.data} />
    </div>
  );
}