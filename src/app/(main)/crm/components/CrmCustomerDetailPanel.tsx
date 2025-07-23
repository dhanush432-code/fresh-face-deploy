// FILE: /app/crm/components/CrmCustomerDetailPanel.tsx - FINAL, WITH CONTACT INFO

'use client';

import React, { useState, useEffect } from 'react';
import { CrmCustomer } from '../types';
import { 
  XMarkIcon, 
  SparklesIcon, 
  TagIcon, 
  QrCodeIcon,
  PhoneIcon, // 1. IMPORT NEW ICONS
  EnvelopeIcon 
} from '@heroicons/react/24/outline';

interface CrmCustomerDetailPanelProps {
  customer: CrmCustomer | null;
  isOpen: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onGrantMembership: (customerId: string, barcode: string) => void;
}

const CrmCustomerDetailPanel: React.FC<CrmCustomerDetailPanelProps> = ({
  customer,
  isOpen,
  isUpdating,
  onClose,
  onGrantMembership,
}) => {
  // ... (all your existing state and hooks remain the same) ...
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [membershipBarcode, setMembershipBarcode] = useState('');
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  useEffect(() => {
    if (!isOpen || !customer) {
      setShowBarcodeInput(false);
      setMembershipBarcode('');
      setBarcodeError('');
      setIsCheckingBarcode(false);
    }
  }, [customer, isOpen]);

  useEffect(() => {
    if (!showBarcodeInput || !membershipBarcode.trim()) {
      setBarcodeError('');
      return;
    }
    const handler = setTimeout(async () => {
      setIsCheckingBarcode(true);
      setBarcodeError('');
      try {
        const res = await fetch(`/api/customer/check-barcode?barcode=${encodeURIComponent(membershipBarcode.trim())}`);
        const data = await res.json();
        if (data.exists) {
          setBarcodeError('This barcode is already in use.');
        }
      } catch (error) {
        setBarcodeError('Could not validate barcode.');
      } finally {
        setIsCheckingBarcode(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [membershipBarcode, showBarcodeInput]);

  const handleConfirmGrant = () => {
    if (!customer || !membershipBarcode.trim() || !!barcodeError || isCheckingBarcode) {
      return;
    }
    onGrantMembership(customer._id, membershipBarcode.trim());
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatGender = (gender?: string) => {
    if (!gender || gender.toLowerCase() === 'other') {
      return 'Not Specified';
    }
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const panelClasses = `fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-40 w-full md:w-[400px] lg:w-[450px] ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  const renderLoadingState = () => (
    <div className="p-6 h-full flex flex-col items-center justify-center text-center text-gray-500">
      <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mb-4"></div>
      <p>Loading customer details...</p>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="p-6 pb-4 border-b flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900 leading-tight">{customer!.name}</h3>
            <div className="mt-2">
              {customer!.currentMembership ? (
                <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 items-center gap-1">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Member
                </span>
              ) : (
                <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                  Not a Member
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full ml-4 flex-shrink-0">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-grow overflow-y-auto p-6 space-y-6">
        
        {/* Contact Information */}
        <div className="space-y-3 pb-4 border-b">
          <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="w-4 h-4 text-gray-500" />
              <a href={`tel:${customer!.phoneNumber}`} className="text-gray-800 hover:text-indigo-600">{customer!.phoneNumber}</a>
          </div>
          {/* 2. CONDITIONALLY RENDER THE EMAIL */}
          {customer!.email && (
            <div className="flex items-center gap-3 text-sm">
                <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                <a href={`mailto:${customer!.email}`} className="text-gray-800 hover:text-indigo-600">{customer!.email}</a>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-600 w-24">Activity Status:</span>
                {customer!.status && (
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${customer!.status === 'Active' ? 'bg-green-100 text-green-800' : customer!.status === 'Inactive' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {customer!.status}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-600 w-24">Gender:</span>
                <span className="text-gray-800">{formatGender(customer!.gender)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-600 w-24">Loyalty Points:</span>
                <span className="font-bold text-lg text-indigo-600">{customer!.loyaltyPoints ?? 0}</span>
            </div>
        </div>
        
        {/* Membership Actions */}
        {!customer!.currentMembership && (
          <div className="pt-4 border-t">
            {!showBarcodeInput ? (
               <button onClick={() => setShowBarcodeInput(true)} className="w-full text-center py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                + Grant Membership
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm font-semibold text-gray-800">Assign Membership Barcode</p>
                <div>
                  <label htmlFor="membershipBarcode" className="block text-xs font-medium text-gray-600 mb-1">Enter a unique barcode</label>
                  <div className="relative">
                    <input id="membershipBarcode" type="text" value={membershipBarcode} onChange={(e) => setMembershipBarcode(e.target.value.toUpperCase())} placeholder="e.g., MEMBER123" className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${!!barcodeError ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`} />
                    <QrCodeIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {isCheckingBarcode && <p className="text-xs text-gray-500 mt-1">Checking...</p>}
                  {barcodeError && <p className="text-xs text-red-600 mt-1">{barcodeError}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleConfirmGrant} disabled={isUpdating || isCheckingBarcode || !membershipBarcode.trim() || !!barcodeError} className="flex-1 py-2 px-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                    {isUpdating ? 'Granting...' : 'Confirm Grant'}
                  </button>
                  <button onClick={() => setShowBarcodeInput(false)} className="py-2 px-3 text-sm bg-white border rounded-md hover:bg-gray-100">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointment History */}
        <div>
          <h4 className="text-base font-semibold text-gray-800 mb-3 border-t pt-4">Appointment History</h4>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {(!customer!.appointmentHistory || customer!.appointmentHistory.length === 0) ? (
              <p className="text-gray-500 text-sm py-4 text-center italic">No paid appointments found.</p>
            ) : (
              customer!.appointmentHistory.map(apt => (
                <div key={apt._id} className="p-3 bg-gray-100/70 rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold">{formatDate(apt.date)}</p>
                    <p className="font-bold text-gray-800">₹{(apt.totalAmount || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-gray-600">with {apt.stylistName}</p>
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t text-xs text-gray-500">
                    <TagIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{Array.isArray(apt.services) ? apt.services.join(', ') : 'Details unavailable'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

 return (
    <aside className={panelClasses} aria-hidden={!isOpen}>
      <button onClick={onClose} className="absolute top-6 right-6 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
        <XMarkIcon className="w-6 h-6" />
      </button>
      {customer ? renderCustomerDetails() : renderLoadingState()}
    </aside>
  );
};

export default CrmCustomerDetailPanel;