// FILE: /app/crm/components/AddMembershipModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { CrmCustomer, MembershipPlanFE } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback to trigger data refresh
  customer: CrmCustomer | null;
}

/**
 * A modal to add a new membership to a specified customer.
 * It fetches available membership plans and handles the submission.
 */
const AddMembershipModal: React.FC<AddMembershipModalProps> = ({ isOpen, onClose, onSuccess, customer }) => {
  const [plans, setPlans] = useState<MembershipPlanFE[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      // Reset state and fetch plans when modal opens
      setError(null);
      setSelectedPlanId('');
      setIsSubmitting(false);
      setIsLoadingPlans(true);

      fetch('/api/membership-plans')
        .then(res => res.json())
        .then(data => {
          if (!data.success) throw new Error(data.message || 'Failed to fetch plans');
          setPlans(data.plans);
        })
        .catch(e => setError(e.message))
        .finally(() => setIsLoadingPlans(false));
    }
  }, [isOpen, customer]);

  const handleSubmit = async () => {
    if (!customer || !selectedPlanId) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/customer-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, membershipPlanId: selectedPlanId }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to add membership.");
      }
      
      toast.success("Membership added successfully!");
      onSuccess(); // Signal parent to refresh data
      onClose();   // Close this modal

    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg text-black">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Add Membership to {customer.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded-full" disabled={isSubmitting}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        {isLoadingPlans ? (
          <p className="text-center py-4 text-gray-600">Loading available plans...</p>
        ) : plans.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="membershipPlanSelect" className="block text-sm font-medium text-gray-700">Select Plan:</label>
              <select
                id="membershipPlanSelect"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="" disabled>-- Choose a plan --</option>
                {plans.map(plan => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ₹{plan.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200" disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                disabled={isSubmitting || !selectedPlanId}
              >
                {isSubmitting ? 'Adding...' : 'Confirm & Add'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center py-4 text-gray-600">No membership plans are currently available.</p>
        )}
      </div>
    </div>
  );
};

export default AddMembershipModal;