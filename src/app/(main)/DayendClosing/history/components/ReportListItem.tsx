// FILE: /app/DayendClosing/history/components/ReportListItem.tsx
'use client';

import { useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { DayEndReportHistoryItem } from '../hooks/useReportHistory';
import { ReportDetailView } from './ReportDetailView';

// [THE FIX] This is the new, detailed badge component.
// It displays the amount, color-codes it, and shows "Shortage" or "Overage".
const NetDiscrepancyBadge = ({ value }: { value: number }) => {
  if (value === 0) {
    return (
      <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
        Perfect Match
      </div>
    );
  }

  const isShort = value < 0;
  const colorClasses = isShort
    ? 'bg-red-100 text-red-800'
    : 'bg-yellow-100 text-yellow-800';
  const sign = isShort ? '−' : '+'; // Using a proper minus sign for style
  const term = isShort ? 'Shortage' : 'Overage';

  return (
    <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${colorClasses}`}>
      <span>{sign}₹{Math.abs(value).toFixed(2)}</span>
      <span className="hidden sm:inline font-normal ml-1.5 opacity-80 text-xs">({term})</span>
    </div>
  );
};

// This is the main list item component.
export const ReportListItem = ({ report }: { report: DayEndReportHistoryItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <li className="bg-white">
      <div
        className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {/* Left side: Date and User */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
            <span className="font-semibold text-lg text-gray-800 truncate">{formatDate(report.closingDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 ml-9">
            <UserCircleIcon className="h-4 w-4" />
            <span>Closed by {report.closedBy?.name || 'N/A'}</span>
          </div>
        </div>

        {/* Right side: Discrepancy Badge and Chevron */}
        <div className="flex items-center gap-4 sm:gap-6 ml-4">
          {/* [THE FIX] We are now calling the new NetDiscrepancyBadge component here. */}
          <NetDiscrepancyBadge value={report.discrepancies.total} />
          <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* The expandable detail view */}
      {isExpanded && <ReportDetailView report={report} />}
    </li>
  );
};