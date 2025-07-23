'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// <-- THE FIX: The interface is updated to match the API response structure perfectly.
export interface DayEndReportHistoryItem {
  _id: string;
  closingDate: string;
   openingBalance: number; // <-- ADD THIS
  pettyCash: { total: number }; // <-- ADD THIS
  expectedTotals: { cash: number; card: number; upi: number; other: number; total: number; };
  // 1. Renamed 'actual' to 'actualTotals'
  // 2. Used 'totalCountedCash'
  // 3. Added 'other' for completeness
  actualTotals: { totalCountedCash: number; card: number; upi: number; other: number; total: number};
  discrepancies: { cash: number; card: number; upi: number; total: number; };
  notes?: string;
  closedBy: { name: string; };
  createdAt: string;
}

const getInitialDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
    };
};

export function useReportHistory() {
  const [reports, setReports] = useState<DayEndReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(getInitialDates());

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fetchHistory = useCallback(async (currentFilters: { startDate: string, endDate: string }) => {
    setIsLoading(true);
    setError(null);
    
    const queryParams = new URLSearchParams();
    if (currentFilters.startDate) queryParams.append('startDate', currentFilters.startDate);
    if (currentFilters.endDate) queryParams.append('endDate', currentFilters.endDate);
    
    try {
      const res = await fetch(`/api/reports/day-end-history?${queryParams.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP error! Status: ${res.status}`);
      }
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch history');
      }
      
      setReports(data.data);
    } catch (e: any) {
      setError(e.message);
      toast.error(`Error: ${e.message}`);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(filters);
  }, [fetchHistory]); // Removed filters from dep array to prevent re-fetch on date change, only on submit

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(filters.startDate) > new Date(filters.endDate)) {
        toast.error("Start date cannot be after end date.");
        return;
    }
    fetchHistory(filters);
  };
  
  return {
    reports,
    isLoading,
    error,
    filters,
    handleFilterChange,
    handleApplyFilters,
  };
}