'use client';

import { FC, useMemo } from 'react';
import { XMarkIcon, BoltIcon, CurrencyRupeeIcon, CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// --- TYPE DEFINITIONS ---
interface IEBReading {
  _id: string;
  date: string;
  unitsConsumed?: number;
  totalCost?: number;
  costPerUnit?: number; // The cost stamped on this specific day
}

interface IEBReadingWithAppointments extends IEBReading {
  appointmentCount?: number;
}

interface ReadingsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  readings: IEBReadingWithAppointments[];
}

// --- Reusable Stat Card Component ---
const StatCard: FC<{ title: string; value: string; icon: React.ReactNode; color: string; }> = ({ title, value, icon, color }) => (
    <div className={`bg-opacity-10 p-4 rounded-xl flex items-center ${color}`}>
        <div className="flex-shrink-0 bg-white rounded-full p-3 shadow-sm">{icon}</div>
        <div className="ml-4">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-xl lg:text-2xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);


// --- MAIN MODAL COMPONENT ---
const ReadingsSummaryModal: FC<ReadingsSummaryModalProps> = ({ isOpen, onClose, readings }) => {
    
    // This summary calculation is correct. It sums the final values from the database.
    const summaryStats = useMemo(() => {
        if (!readings || readings.length === 0) {
            return { totalUnits: 0, totalCost: 0, totalAppointments: 0, averageCostPerUnit: 0 };
        }
        
        const totalUnits = readings.reduce((sum, r) => sum + (r.unitsConsumed || 0), 0);
        const totalCost = readings.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        const totalAppointments = readings.reduce((sum, r) => sum + (r.appointmentCount || 0), 0);
        
        // Calculate the true weighted average cost
        const averageCostPerUnit = totalUnits > 0 ? totalCost / totalUnits : 0;
        
        return { totalUnits, totalCost, totalAppointments, averageCostPerUnit };
    }, [readings]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Overall Summary</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                {/* Modal Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard 
                            title="Total Units Consumed" 
                            value={summaryStats.totalUnits.toFixed(2)} 
                            icon={<BoltIcon className="h-6 w-6 text-teal-500" />}
                            color="bg-teal-500"
                        />
                        <StatCard 
                            title="Total Cost" 
                            value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summaryStats.totalCost)} 
                            icon={<CurrencyRupeeIcon className="h-6 w-6 text-amber-500" />}
                            color="bg-amber-500"
                        />
                        <StatCard 
                            title="Total Appointments" 
                            value={String(summaryStats.totalAppointments)}
                            icon={<CalendarDaysIcon className="h-6 w-6 text-sky-500" />}
                            color="bg-sky-500"
                        />
                         <StatCard 
                            title="Avg. Cost Per Unit" 
                            value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summaryStats.averageCostPerUnit)} 
                            icon={<ChartBarIcon className="h-6 w-6 text-violet-500" />}
                            color="bg-violet-500"
                        />
                    </div>
                    
                    {/* Daily Breakdown */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">Daily Breakdown</h3>
                        <div className="bg-white rounded-lg border border-slate-200">
                           <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                <div>Date</div>
                                <div className="text-right">Units Used</div>
                                <div className="text-right">Cost / Unit (Applied)</div>
                                <div className="text-right">Total Cost</div>
                                <div className="text-right">Appointments</div>
                            </div>
                           <ul className="divide-y divide-slate-200">
                                {readings.map((reading, index) => {
                                    // --- THE FIX IS HERE ---
                                    // The `readings` array is sorted descending (newest first).
                                    // The cost used for the current `reading` is from the "next day",
                                    // which is the item at the previous index in this sorted array.
                                    const costUsedForCalculation = (index > 0) ? readings[index - 1].costPerUnit : undefined;

                                    return (
                                        <li key={reading._id} className="p-4 grid grid-cols-5 gap-4 items-center text-sm hover:bg-slate-50">
                                           <div className="font-medium text-slate-800">
                                               {new Date(reading.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                           </div>
                                           <div className="text-slate-600 text-right">
                                                <span className="font-semibold text-slate-800">{reading.unitsConsumed?.toFixed(2) ?? 'N/A'}</span>
                                           </div>
                                           <div className="text-slate-600 text-right">
                                                {/* We now display the cost that was ACTUALLY used for the calculation */}
                                                <span className="font-semibold text-slate-800">{costUsedForCalculation ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(costUsedForCalculation) : 'N/A'}</span>
                                           </div>
                                           <div className="text-slate-600 text-right">
                                                <span className="font-semibold text-slate-800">{reading.totalCost ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(reading.totalCost) : 'N/A'}</span>
                                           </div>
                                           <div className="text-slate-600 text-right">
                                                <span className="font-semibold text-slate-800">{reading.appointmentCount ?? 0}</span>
                                           </div>
                                        </li>
                                    );
                                })}
                           </ul>
                           {readings.length === 0 && (
                               <p className="p-8 text-center text-slate-500">No data available to display.</p>
                           )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadingsSummaryModal;