import { useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface IStylistHistoryItem {
  _id: string;
  date: string;
  customerName: string;
  services: string;
  amount: number;
  estimatedDuration: number;
  actualDuration: number;
}

interface StylistHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stylistName: string;
  history: IStylistHistoryItem[];
  isLoading: boolean;
}

// Helper to get date thresholds
const getStartDate = (filter: string): Date | null => {
  const now = new Date();
  switch (filter) {
    case 'week': {
      // ISO week: start on Monday
      const day = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.setDate(diff));
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
};

export default function StylistHistoryModal({
  isOpen,
  onClose,
  stylistName,
  history,
  isLoading,
}: StylistHistoryModalProps) {
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');

  // Filtered history based on selected period
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history;
    const start = getStartDate(filter);
    if (!start) return history;
    return history.filter(item => new Date(item.date) >= start);
  }, [history, filter]);

  // Compute totals
  const { totalAmount, totalExtraTime } = useMemo(() => {
    return filteredHistory.reduce(
      (acc, item) => {
        acc.totalAmount += item.amount;
        const extra = item.actualDuration - item.estimatedDuration;
        if (extra > 0) acc.totalExtraTime += extra;
        return acc;
      },
      { totalAmount: 0, totalExtraTime: 0 }
    );
  }, [filteredHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Service History for <span className="text-black">{stylistName}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters & Totals */}
        <div className="flex items-center justify-between p-4 border-b space-x-4">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <div className="space-x-6">
            <span className="font-medium">
              Total Billed: <strong>₹{totalAmount.toFixed(2)}</strong>
            </span>
            <span className="font-medium">
              Extra Time: <strong>{totalExtraTime} min</strong>
            </span>
          </div>
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center">Loading history...</div>
          ) : filteredHistory.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm bg-white">
                <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Services Performed</th>
                    <th className="px-4 py-3 text-right">Amount Billed</th>
                    <th className="px-4 py-3 text-right">Est. Time (min)</th>
                    <th className="px-4 py-3 text-right">Actual Time (min)</th>
                    <th className="px-4 py-3 text-right">Extra Time (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredHistory.map(item => {
                    const dateObj = new Date(item.date);
                    const extra = item.actualDuration - item.estimatedDuration;
                    return (
                      <tr key={item._id}>
                        <td className="px-4 py-3 whitespace-nowrap">{dateObj.toLocaleDateString()}</td>
                        <td className="px-4 py-3">{item.customerName}</td>
                        <td className="px-4 py-3">{item.services}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          ₹{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">{item.estimatedDuration}</td>
                        <td className="px-4 py-3 text-right">
                          {item.actualDuration > 0 ? item.actualDuration : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {extra > 0 ? extra : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No paid service history found for this stylist.
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
