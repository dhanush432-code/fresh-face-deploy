// FILE: /app/DayendClosing/history/components/ReportList.tsx
'use client';
import { DayEndReportHistoryItem } from '../hooks/useReportHistory';
import { ReportListItem } from './ReportListItem';

export const ReportList = ({ reports }: { reports: DayEndReportHistoryItem[] }) => {
  return (
    <ul className="divide-y divide-gray-200">
      {reports.map((report) => (
        <ReportListItem key={report._id} report={report} />
      ))}
    </ul>
  );
};