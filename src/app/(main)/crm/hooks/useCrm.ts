// /app/crm/hooks/useCrm.ts - FINAL CORRECTED VERSION

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { CrmCustomer, PaginationInfo } from '../types';

export function useCrm() {
  // Data state
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ currentPage: 1, totalPages: 1, totalCustomers: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // UI State for Modals and Panels
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomer | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomer | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const [isMembershipUpdating, setIsMembershipUpdating] = useState(false);
  
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await fetch(`/api/customer?page=${page}&limit=10&search=${debouncedSearchTerm}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to fetch customers');
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (err: any) {
      setPageError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    // Only fetch if debouncedSearchTerm is not empty or if it's the initial load
    if (debouncedSearchTerm || searchTerm === '') {
      fetchCustomers(pagination.currentPage);
    }
  }, [fetchCustomers, pagination.currentPage, debouncedSearchTerm]);
  
  const refreshData = () => {
    fetchCustomers(pagination.currentPage);
  };

  const fetchCustomerDetails = async (customerId: string): Promise<CrmCustomer | null> => {
    try {
        const response = await fetch(`/api/customer/${customerId}`, { cache: 'no-store' });
        const apiResponse = await response.json();
        if (!response.ok || !apiResponse.success) {
            throw new Error(apiResponse.message || 'Failed to fetch details');
        }
        return apiResponse.customer;
    } catch (error: any) {
        toast.error(`Error loading details: ${error.message}`);
        return null;
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${customerName}? Their history will be saved.`)) return;
    try {
      const response = await fetch(`/api/customer/${customerId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to deactivate customer.');
      toast.success('Customer deactivated successfully.');
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 1. THIS IS THE CORRECTED FUNCTION
  const handleViewCustomerDetails = useCallback(async (customer: CrmCustomer) => {
    // Use `_id` for comparison to be safe
    if (isDetailPanelOpen && selectedCustomer?._id === customer._id) {
        setIsDetailPanelOpen(false);
        return;
    }
    setPanelKey(prevKey => prevKey + 1); 
    setIsDetailPanelOpen(true);
    setSelectedCustomer(null); // Show loading state

    // Use `_id` to fetch details, as it's the raw database identifier
    const detailedData = await fetchCustomerDetails(customer._id);
    setSelectedCustomer(detailedData);
  }, [isDetailPanelOpen, selectedCustomer]);
  
  const handleOpenAddModal = () => { setEditingCustomer(null); setIsAddEditModalOpen(true); };
  const handleOpenEditModal = (customer: CrmCustomer) => { setEditingCustomer(customer); setIsAddEditModalOpen(true); };
  const handleCloseAddEditModal = () => { setIsAddEditModalOpen(false); setEditingCustomer(null); };

  // 2. THIS IS THE CORRECTED MEMBERSHIP HANDLER
  const handleGrantMembership = async (customerId: string, barcode: string) => {
    setIsMembershipUpdating(true);
    try {
      const response = await fetch(`/api/customer/${customerId}/toggle-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the complete payload with the barcode
        body: JSON.stringify({ 
          isMembership: true,
          membershipBarcode: barcode,
        }),
      });

      const result = await response.json();
      if (!result.success || !result.customer) {
        throw new Error(result.message || 'Failed to grant membership.');
      }
      
      toast.success(`Membership granted successfully with barcode: ${result.customer.membershipBarcode}`);
      
      // Use the fresh customer object returned from the API
      const freshCustomerData = result.customer;

      // Update the panel with the new complete data.
      setSelectedCustomer(freshCustomerData);

      // Update the customer in the main table list in the background.
      // Use `_id` for reliable matching.
      setCustomers(prev =>
        prev.map(c => (c._id === customerId ? freshCustomerData : c))
      );
      
      // Force a re-mount of the panel for ultimate reliability.
      setPanelKey(prevKey => prevKey + 1);

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsMembershipUpdating(false);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages) {
        setPagination(prev => ({ ...prev, currentPage: pageNumber }));
    }
  };

  return {
    customers, pagination, isLoading, pageError, searchTerm, selectedCustomer,
    isDetailPanelOpen, isAddEditModalOpen, editingCustomer, panelKey, isMembershipUpdating,
    setSearchTerm, goToPage, refreshData, handleViewCustomerDetails, setIsDetailPanelOpen,
    handleDeleteCustomer, handleOpenAddModal, handleOpenEditModal,
    handleCloseAddEditModal, handleGrantMembership,
  };
}