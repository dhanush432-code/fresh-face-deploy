'use client';

import { useState, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Make sure the interface is defined or imported
interface IHistoryEntry {
  timestamp: string;
  user: { id: string; name: string; };
  changes: { field: string; oldValue?: number | string; newValue?: number | string; }[];
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: IHistoryEntry[];
}

export default function HistoryModal({ isOpen, onClose, history }: HistoryModalProps) {
    const [selectedUser, setSelectedUser] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const uniqueUsers = useMemo(() => {
        if (!history || history.length === 0) return [];
        const usersMap = new Map<string, { id: string; name: string }>();
        history.forEach(entry => {
            if (entry.user && entry.user.id && !usersMap.has(entry.user.id)) {
                usersMap.set(entry.user.id, entry.user);
            }
        });
        return Array.from(usersMap.values());
    }, [history]);

    const filteredHistory = useMemo(() => {
        return history
            .filter(entry => {
                if (selectedUser && entry.user.id !== selectedUser) return false;
                const entryDate = new Date(new Date(entry.timestamp).setHours(0, 0, 0, 0));
                if (startDate) {
                    const start = new Date(startDate);
                    if (entryDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                    if (entryDate > end) return false;
                }
                return true;
            })
            .slice()
            .reverse();
    }, [history, selectedUser, startDate, endDate]);

    const handleResetFilters = () => {
        setSelectedUser('');
        setStartDate('');
        setEndDate('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transition-transform duration-300 scale-95 animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">Update History</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800"><XMarkIcon className="h-6 w-6"/></button>
                </div>

                {history.length > 0 && (
                     <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-end gap-4">
                        <div>
                            <label htmlFor="user-filter" className="block text-sm font-medium text-slate-700">User</label>
                            <select id="user-filter" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="mt-1 block w-full min-w-[150px] rounded-md border-slate-300 shadow-sm sm:text-sm p-2">
                                <option value="">All Users</option>
                                {uniqueUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="start-date-filter" className="block text-sm font-medium text-slate-700">From Date</label>
                            <input type="date" id="start-date-filter" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm p-2"/>
                        </div>
                        <div>
                            <label htmlFor="end-date-filter" className="block text-sm font-medium text-slate-700">To Date</label>
                            <input type="date" id="end-date-filter" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm p-2"/>
                        </div>
                        <div>
                            <button onClick={handleResetFilters} className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-100">Reset</button>
                        </div>
                    </div>
                )}
               
                <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No update history found for this entry.</p>
                    ) : filteredHistory.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">No history entries match the current filters.</p>
                    ) : (
                        filteredHistory.map((entry, index) => (
                            <div key={index} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-medium text-slate-800">Changed by: <span className="font-bold">{entry.user.name || 'N/A'}</span></p>
                                    <p className="text-xs text-slate-500 whitespace-nowrap pl-4">{new Date(entry.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                </div>
                                <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
                                    {entry.changes.map((change, cIndex) => (
                                        <li key={cIndex}>
                                            Updated <strong className="text-slate-900">{change.field}</strong> from <code className="text-xs bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded-md">{change.oldValue ?? 'Not Set'}</code> to <code className="text-xs bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded-md">{change.newValue ?? 'Not Set'}</code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
                    <button type="button" className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}