// FILE: /app/crm/page.tsx - COMPLETE VERSION WITH EXPORT

'use client';

import React, { useState } from 'react';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'; // --- ADD ArrowDownTrayIcon ---
import { useCrm } from './hooks/useCrm';
import { CustomerTable } from './components/CustomerTable';
import CrmCustomerDetailPanel from './components/CrmCustomerDetailPanel';
import AddEditCustomerModal from './components/AddEditCustomerModal';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import CustomerImportModal from '@/components/admin/CustomerImportModal';
import { toast } from 'react-toastify';


export default function CrmPage() {
  const { data: session } = useSession();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // --- ADD: State for export loading ---

  const {
    customers,
    pagination,
    isLoading,
    pageError,
    searchTerm,
    selectedCustomer,
    isDetailPanelOpen,
    isAddEditModalOpen,
    editingCustomer,
    panelKey,
    isMembershipUpdating,
    setSearchTerm,
    goToPage,
    refreshData,
    handleViewCustomerDetails,
    setIsDetailPanelOpen,
    handleDeleteCustomer,
    handleOpenAddModal,
    handleOpenEditModal,
    handleCloseAddEditModal,
    handleGrantMembership,
  } = useCrm();

  const canCreateCustomers = session && hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_CREATE);
  const canUpdateCustomers = session && hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_UPDATE);
  const canDeleteCustomers = session && hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_DELETE);

  const handleImportSuccess = (report: any) => {
    // ... (this function remains the same)
    const successMessage = `Import complete: ${report.successfulImports} imported, ${report.failedImports} failed.`;
    toast.success(successMessage, { autoClose: 10000 });
    if (report.failedImports > 0) {
      console.error("Customer Import Errors:", report.errors);
      toast.error("Some customers failed to import. Check the developer console for a detailed report.", { autoClose: false });
    }
    refreshData();
  };

  // --- ADD: Handler for the server-side export ---
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/customer/export');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to start export. Please try again.' }));
        throw new Error(errorData.message || 'An unknown error occurred.');
      }

      const disposition = response.headers.get('Content-Disposition');
      let filename = 'Customers.xlsx';
      if (disposition && disposition.includes('attachment')) {
        const filenameMatch = /filename="([^"]+)"/.exec(disposition);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Failed to export customers:", err);
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 sm:p-6">
      <main
        className={`flex-grow transition-all duration-300 ${isDetailPanelOpen ? 'md:mr-[400px] lg:mr-[450px]' : 'mr-0'}`}
      >
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-600">Manage your entire customer base.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {canCreateCustomers && (
              <>
                <button
                  onClick={handleExportAll}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {isExporting ? 'Exporting...' : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Export All
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                >
                  Import
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-black rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add
                </button>
              </>
            )}
          </div>
        </header>

        {/* --- The rest of your component remains the same --- */}

        <div className="space-y-6">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />

          {isLoading && <div className="p-10 text-center text-gray-500">Loading customers...</div>}

          {pageError && <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm">{pageError}</div>}

          {!isLoading && !pageError && customers.length === 0 && (
            <div className="py-16 text-center text-gray-500 bg-white rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold">No Customers Found</h3>
              <p>{searchTerm ? `No customers match your search for "${searchTerm}".` : "You haven't added any customers yet."}</p>
            </div>
          )}

          {!isLoading && !pageError && customers.length > 0 && (
            <CustomerTable
              customers={customers}
              pagination={pagination}
              onViewDetails={handleViewCustomerDetails}
              onEdit={canUpdateCustomers ? handleOpenEditModal : undefined}
              onDelete={canDeleteCustomers ? handleDeleteCustomer : undefined}
              onGoToPage={goToPage}
            />
          )}
        </div>
      </main>

      <CrmCustomerDetailPanel
        key={panelKey}
        customer={selectedCustomer}
        isOpen={isDetailPanelOpen}
        isUpdating={isMembershipUpdating}
        onClose={() => setIsDetailPanelOpen(false)}
        onGrantMembership={handleGrantMembership}
      />
      {isDetailPanelOpen && <div onClick={() => setIsDetailPanelOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" />}

      <AddEditCustomerModal
        isOpen={isAddEditModalOpen}
        onClose={handleCloseAddEditModal}
        onSave={refreshData}
        customerToEdit={editingCustomer}
      />
      
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}