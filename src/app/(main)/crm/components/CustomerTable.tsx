// /app/crm/components/CustomerTable.tsx - UPDATED VERSION

'use client';

import React from 'react';
// Make sure CrmCustomer is imported from the correct path
import { CrmCustomer, PaginationInfo } from '../types';
import {
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';

// Helper function for Customer Activity Status
const getCustomerStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'New': return 'bg-indigo-100 text-indigo-800';
      case 'Inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
};

// Helper function to format dates nicely
const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    // This will format the date to the user's local format, e.g., "12/25/2023" in the US
    return new Date(dateString).toLocaleDateString(); 
};

interface CustomerTableProps {
  customers: CrmCustomer[];
  pagination: PaginationInfo;
  onViewDetails: (customer: CrmCustomer) => void;
  onEdit?: (customer: CrmCustomer) => void;
  onDelete?: (customerId: string, customerName: string) => void;
  onGoToPage: (page: number) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  pagination,
  onViewDetails,
  onEdit,
  onDelete,
  onGoToPage,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Name</th>
              <th className="px-6 py-4 text-left font-semibold">Activity Status</th>
              {/* NEW COLUMN HEADERS */}
              <th className="px-6 py-4 text-left font-semibold">Last Visit</th>
              <th className="px-6 py-4 text-left font-semibold">Last Services</th>
              {/* END NEW COLUMN HEADERS */}
              <th className="px-6 py-4 text-center font-semibold">Membership</th>
              <th className="px-6 py-4 text-center font-semibold">Loyalty Points</th>
              <th className="px-6 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => {
              // --- NEW LOGIC: DERIVE LAST VISIT INFO ---
              // Get the most recent appointment (assuming the list is sorted newest to oldest)
               console.log(`Data for customer "${customer.name}":`, customer);
              // You can also log the specific field you're interested in:
              console.log(`Appointment History for "${customer.name}":`, customer.appointmentHistory);
              const latestAppointment = customer.appointmentHistory?.[0];

              // Get the last visit date from that appointment
              const lastVisitDate = latestAppointment?.date;

              // Get the last services. Prefer the 'services' array, fallback to 'service' string.
              const lastServices = latestAppointment?.services?.join(', ') || latestAppointment?.service;
              // --- END OF NEW LOGIC ---

              return (
                <tr
                  key={customer._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onViewDetails(customer)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.email ?? 'No Email'}</div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span 
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCustomerStatusColor(customer.status)}`}
                    >
                      {customer.status ?? 'Unknown'}
                    </span>
                  </td>

                  {/* NEW TABLE CELLS TO DISPLAY THE DATA */}
                  <td className="px-6 py-4 text-gray-700">
                    {formatDate(lastVisitDate)}
                  </td>
                  <td className="px-6 py-4 text-gray-700 truncate max-w-xs" title={lastServices}>
                    {lastServices ?? 'N/A'}
                  </td>
                  {/* END NEW TABLE CELLS */}

                  <td className="px-6 py-4 text-center">
                    {customer.isMembership ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-yellow-700">
                        <SparklesIcon className="w-4 h-4 text-yellow-500" />
                        YES
                      </span>
                    ) : (
                      <span className="text-gray-500">No</span> 
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-lg text-indigo-600">
                    {customer.loyaltyPoints ?? 0}
                  </td>
                  <td 
                    className="px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <div className="flex items-center justify-end space-x-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(customer)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                          title="Edit Customer"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (onDelete) {
                              onDelete(customer._id, customer.name);
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                          title="Deactivate Customer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (No changes needed here) */}
      {pagination.totalPages > 1 && (
         <div className="px-6 py-4 border-t flex items-center justify-between text-sm text-gray-600">
            <div>
                Showing{' '}
                <span className="font-semibold">{(pagination.currentPage - 1) * pagination.limit + 1}</span>
                {' '}to{' '}
                <span className="font-semibold">{Math.min(pagination.currentPage * pagination.limit, pagination.totalCustomers)}</span>
                {' '}of{' '}
                <span className="font-semibold">{pagination.totalCustomers}</span>
                {' '}results
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => onGoToPage(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 flex items-center hover:bg-gray-50"
                >
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Previous
                </button>
                <span>
                    Page <span className="font-semibold">{pagination.currentPage}</span> of <span className="font-semibold">{pagination.totalPages}</span>
                </span>
                <button
                    onClick={() => onGoToPage(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 flex items-center hover:bg-gray-50"
                >
                    Next
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
            </div>
         </div>
      )}
    </div>
  );
};