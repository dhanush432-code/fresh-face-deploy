// FILE: /app/DayendClosing/history/components/FilterBar.tsx
'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

interface FilterBarProps {
  filters: { startDate: string; endDate: string };
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onSubmit, isLoading }) => {
  return (
    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border">
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={onFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
          <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={onFilterChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>
        <button type="submit" disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50">
          <FunnelIcon className="h-5 w-5"/>
          {isLoading ? 'Loading...' : 'Apply Filters'}
        </button>
      </form>
    </div>
  );
};