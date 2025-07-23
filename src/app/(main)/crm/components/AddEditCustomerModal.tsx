// src/app/(main)/crm/components/AddEditCustomerModal.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { toast } from 'react-toastify';
import { CrmCustomer, AddCustomerFormData } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Gender } from '@/types/gender';

interface AddEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customerToEdit: CrmCustomer | null;
}

const AddEditCustomerModal: React.FC<AddEditCustomerModalProps> = ({ isOpen, onClose, onSave, customerToEdit }) => {
  const [formData, setFormData] = useState<AddCustomerFormData>({ name: '', email: '', phoneNumber: '', gender: Gender.Other, dob: '', survey: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = !!customerToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setFormData({
            name: customerToEdit.name,
            email: customerToEdit.email || '',
            phoneNumber: customerToEdit.phoneNumber,
            gender: customerToEdit.gender || 'other',
            dob: customerToEdit.dob ? new Date(customerToEdit.dob).toISOString().split('T')[0] : '',
            survey: customerToEdit.survey || ''
        });
      } else {
        setFormData({ name: '', email: '', phoneNumber: '', gender: 'other', dob: '', survey: '' });
      }
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, customerToEdit, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    // --- FIXED: Ensure endpoint matches the API file structure ---
    // The file `/api/customer/route.ts` creates the endpoint `/api/customer`.
    // For editing, you would need another file at `/api/customer/[id]/route.ts`.
    const apiEndpoint = isEditMode ? `/api/customer/${customerToEdit?._id}` : '/api/customer';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        // Use the detailed error message from the server
        throw new Error(result.message || 'Failed to save customer.');
      }

      toast.success(`Customer ${isEditMode ? 'updated' : 'added'} successfully!`);
      onSave();
      onClose();

    } catch (error: any) {
      console.error("Form submission error:", error);
      setFormError(error.message);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">{isEditMode ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{formError}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
           <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
           <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (Optional)</label>
            <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
              <option value={Gender.Female}>Female</option>
              <option value={Gender.Male}>Male</option>
              <option value={Gender.Other}>Other</option>
            </select>
          </div>
           <div>
            <label htmlFor="survey" className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us? (Optional)</label>
            <textarea name="survey" id="survey" value={formData.survey} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-200" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-white bg-black text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditCustomerModal;