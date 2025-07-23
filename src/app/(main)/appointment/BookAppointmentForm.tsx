// src/app/(main)/appointment/BookAppointmentForm.tsx
'use-client';

import React, { useState, useEffect, FormEvent, useCallback, useRef } from 'react';
import { ChevronDownIcon, XMarkIcon, UserCircleIcon, CalendarDaysIcon, SparklesIcon, TagIcon, GiftIcon, ClockIcon, EyeIcon, QrCodeIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import { formatDateIST, formatTimeIST } from '@/lib/dateFormatter';
import { useDebounce } from '@/hooks/useDebounce'; 

// ===================================================================================
//  INTERFACES & TYPE DEFINITIONS (MODIFIED FOR GROUP BOOKINGS)
// ===================================================================================
export interface ServiceAssignment {
  _tempId: string;      // A temporary client-side ID for React list keys
  serviceId: string;    // The ID of the service
  stylistId: string;    // The ID of the stylist assigned to THIS service
  guestName?: string;   // Optional name for the person receiving the service (e.g., "Son")
}

export interface ServiceAssignmentState extends ServiceAssignment {
  serviceDetails: ServiceFromAPI;      // Full details of the service for display
  availableStylists: StylistFromAPI[]; // List of stylists available for this specific service
  isLoadingStylists: boolean;          // Loading state for this service's stylist list
}

export interface NewBookingData {
  customerId?: string;
  phoneNumber: string;
  customerName: string;
  email: string;
  gender?: string;
  // REPLACED `serviceIds` and `stylistId` with the array below
  serviceAssignments: { serviceId: string; stylistId: string; guestName?: string }[];
  date: string;
  time: string;
  notes?: string;
  status: 'Appointment' | 'Checked-In';
  appointmentType?: 'Online' | 'Offline';
}

interface AppointmentFormData {
  customerId?: string; // This now correctly allows string or undefined
  phoneNumber: string;
  customerName: string;
  email: string;
  gender: string;
  date: string;
  time: string;
  notes: string;
  status: 'Appointment' | 'Checked-In';
}

interface ServiceFromAPI {
  _id: string;
  name: string;
  price: number;
  duration: number;
  membershipRate?: number;
}

interface StylistFromAPI {
  _id: string;
  name: string;
}

interface CustomerSearchResult {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  gender?: string;
}

interface AppointmentHistory {
  _id: string;
  date: string;
  services: string[];
  totalAmount: number;
  stylistName: string;
  status: string;
}

interface CustomerDetails {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  isMember: boolean;
  membershipDetails: { planName: string; status: string } | null;
  lastVisit: string | null;
  appointmentHistory: AppointmentHistory[];
  loyaltyPoints?: number;
  membershipBarcode?: string;
}

interface BookAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  // MODIFIED: The function now expects the new data structure.
  onBookAppointment: (data: NewBookingData) => Promise<void>;
}

// ===================================================================================
//  CUSTOMER HISTORY MODAL & CUSTOMER DETAIL PANEL
// ===================================================================================

const CustomerHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetails | null;
}> = ({ isOpen, onClose, customer }) => {
  if (!isOpen || !customer) return null;

  const totalSpent = customer.appointmentHistory
    .filter(apt => apt.status === 'Paid')
    .reduce((sum, apt) => sum + apt.totalAmount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Appointment': return 'bg-blue-100 text-blue-800';
      case 'Checked-In': return 'bg-yellow-100 text-yellow-800';
      case 'Checked-Out': return 'bg-purple-100 text-purple-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'No-Show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold">Complete History - {customer.name}</h2>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Customer Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{customer.appointmentHistory.length}</div>
            <div className="text-sm text-gray-600">Total Visits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ₹{customer.appointmentHistory
                .filter(apt => apt.status === 'Paid')
                .reduce((sum, apt) => sum + apt.totalAmount, 0)
                .toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{customer.loyaltyPoints || 0}</div>
            <div className="text-sm text-gray-600">Loyalty Points</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${customer.isMember ? 'text-green-600' : 'text-gray-400'}`}>
              {customer.isMember ? 'YES' : 'NO'}
            </div>
            <div className="text-sm text-gray-600">Member</div>
          </div>
        </div>

        {/* Barcode Display */}
        {customer.membershipBarcode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <QrCodeIcon className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-800">Membership Barcode</div>
                <div className="text-sm text-blue-600 font-mono">{customer.membershipBarcode}</div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment History */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Appointment History</h3>
          {customer.appointmentHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No appointment history found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Services</th>
                    <th className="px-4 py-2 text-left">Stylist</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.appointmentHistory.map((apt) => (
                    <tr key={apt._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(apt.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate" title={apt.services.join(', ')}>
                          {apt.services.join(', ') || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">{apt.stylistName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ₹{apt.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CustomerDetailPanelProps {
  customer: CustomerDetails | null;
  isLoading: boolean;
  onToggleMembership: (customBarcode?: string) => void;
  onViewFullHistory: () => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({
  customer,
  isLoading,
  onToggleMembership,
  onViewFullHistory
}) => {
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [membershipBarcode, setMembershipBarcode] = useState('');
  const [isBarcodeValid, setIsBarcodeValid] = useState(true);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  useEffect(() => {
    if (!membershipBarcode.trim()) {
      setIsBarcodeValid(true); setBarcodeError(''); return;
    }
    const barcodeRegex = /^[A-Z0-9-_]{3,20}$/i;
    if (!barcodeRegex.test(membershipBarcode.trim())) {
      setIsBarcodeValid(false); setBarcodeError('Barcode must be 3-20 characters (letters, numbers, hyphens, underscores only)'); return;
    }
    const handler = setTimeout(async () => {
      setIsCheckingBarcode(true); setBarcodeError('');
      try {
        const res = await fetch(`/api/customer/check-barcode?barcode=${encodeURIComponent(membershipBarcode.trim())}`);
        const data = await res.json();
        if (data.success) {
          setIsBarcodeValid(!data.exists);
          if (data.exists) setBarcodeError('This barcode is already in use');
        } else {
          setIsBarcodeValid(false); setBarcodeError('Failed to validate barcode');
        }
      } catch (error) {
        setIsBarcodeValid(false); setBarcodeError('Network error while checking barcode');
      } finally {
        setIsCheckingBarcode(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [membershipBarcode]);

  const handleGrantMembership = () => {
    if (showBarcodeInput) {
      if (!membershipBarcode.trim()) { setBarcodeError('Please enter a barcode'); return; }
      if (!isBarcodeValid) return;
      onToggleMembership(membershipBarcode.trim());
      setMembershipBarcode(''); setShowBarcodeInput(false); setBarcodeError('');
    } else {
      setShowBarcodeInput(true);
    }
  };

  const handleCancelBarcodeInput = () => {
    setShowBarcodeInput(false); setMembershipBarcode(''); setBarcodeError(''); setIsBarcodeValid(true);
  };
  const getMembershipStatusClasses = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-red-100 text-red-700';
      case 'Cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Appointment': return 'bg-blue-100 text-blue-800';
      case 'Checked-In': return 'bg-yellow-100 text-yellow-800';
      case 'Checked-Out': return 'bg-purple-100 text-purple-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'No-Show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 h-full">
        <div className="h-8 bg-gray-200 rounded-md w-3/4" />
        <div className="h-5 bg-gray-200 rounded-md w-1/2" />
        <div className="h-24 bg-gray-100 rounded-lg mt-6" />
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="space-y-3">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
        <UserCircleIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="font-semibold text-gray-700 mb-2">Customer Details</h3>
        <p className="text-sm text-center">Enter a phone number or scan a barcode to look up an existing customer.</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <QrCodeIcon className="w-4 h-4" />
          <span>Members can use barcode for quick lookup</span>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{customer.name}</h3>
        <button onClick={onViewFullHistory} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Complete History"><EyeIcon className="w-5 h-5" /></button>
      </div>
      <div className="space-y-3 text-sm mb-6">
        <div className="flex items-center gap-3"><SparklesIcon className="w-5 h-5 text-yellow-500" /><span className="font-medium text-gray-600">Membership:</span>{customer.isMember && customer.membershipDetails ? (<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getMembershipStatusClasses(customer.membershipDetails.status)}`}>{customer.membershipDetails.planName} - {customer.membershipDetails.status}</span>) : (<span className="text-gray-500">Not a Member</span>)}</div>
        
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            {!customer.isMember && !showBarcodeInput && (
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <GiftIcon className="w-5 h-5 text-yellow-600" />
                            <span className="font-semibold text-yellow-800">Membership Status</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                            Grant membership for special pricing and barcode access
                        </p>
                    </div>
                    <button 
                        onClick={handleGrantMembership} 
                        className="px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors text-center w-28 shrink-0"
                    >
                        Grant Membership
                    </button>
                </div>
            )}
            {showBarcodeInput && !customer.isMember && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-yellow-800 mb-1">Membership Barcode <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input type="text" value={membershipBarcode} onChange={(e) => setMembershipBarcode(e.target.value.toUpperCase())} placeholder="Enter barcode (e.g., MEMBER001, ABC123)" className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors uppercase ${barcodeError ? 'border-red-300 focus:ring-red-500' : isBarcodeValid && membershipBarcode.trim() ? 'border-green-300 focus:ring-green-500' : 'border-gray-300 focus:ring-blue-500'}`} maxLength={20} />
                            <QrCodeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                        {isCheckingBarcode && (<div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />Checking barcode availability...</div>)}
                        {barcodeError && (<p className="text-xs text-red-600 mt-1">{barcodeError}</p>)}
                        {isBarcodeValid && membershipBarcode.trim() && !isCheckingBarcode && !barcodeError && (<p className="text-xs text-green-600 mt-1 flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-500 rounded-full text-white text-center leading-3 text-[8px]">✓</span>Barcode is available</p>)}
                        <p className="text-xs text-gray-500 mt-1">3-20 characters, letters and numbers only</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleGrantMembership} disabled={!membershipBarcode.trim() || !isBarcodeValid || isCheckingBarcode || !!barcodeError} className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{isCheckingBarcode ? 'Validating...' : 'Grant Membership'}</button>
                        <button onClick={handleCancelBarcodeInput} className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
                    </div>
                </div>
            )}
            {customer.isMember && (
                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <span className="font-medium text-yellow-800">Active Member</span>
                        {customer.membershipBarcode && (<div className="text-xs text-yellow-700 mt-1">Barcode: <span className="font-mono">{customer.membershipBarcode}</span></div>)}
                    </div>
                    <button onClick={() => onToggleMembership()} className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors">Remove Membership</button>
                </div>
            )}
        </div>

        {customer.membershipBarcode && (<div className="flex items-center gap-3"><QrCodeIcon className="w-5 h-5 text-blue-500" /><span className="font-medium text-gray-600">Barcode:</span><div className="flex items-center gap-2"><span className="text-blue-600 font-mono text-xs bg-blue-50 px-2 py-1 rounded">{customer.membershipBarcode}</span><button onClick={() => navigator.clipboard.writeText(customer.membershipBarcode!)} className="text-xs text-blue-500 hover:text-blue-700" title="Copy barcode">Copy</button></div></div>)}
        <div className="flex items-center gap-3"><CalendarDaysIcon className="w-5 h-5 text-gray-400" /><span className="font-medium text-gray-600">Last Visit:</span><span>{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span></div>
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200"><GiftIcon className="w-5 h-5 text-indigo-500" /><span className="font-medium text-gray-600">Loyalty Points:</span><span className="font-bold text-lg text-indigo-600">{customer.loyaltyPoints ?? 0}</span></div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-3"><h4 className="text-base font-semibold text-gray-800">Recent Visits</h4><button onClick={onViewFullHistory} className="text-xs text-blue-600 hover:text-blue-800 transition-colors">View All ({customer.appointmentHistory.length})</button></div>
        <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
          {customer.appointmentHistory.length > 0 ? (customer.appointmentHistory.slice(0, 5).map((apt) => (<div key={apt._id} className="p-3 bg-gray-100/70 rounded-lg text-sm hover:bg-gray-100 transition-colors"><div className="flex justify-between items-start"><div className="flex-1"><p className="font-semibold text-gray-800">{formatDateIST(apt.date)}</p><p className="text-xs text-gray-600">with {apt.stylistName}</p></div><div className="text-right"><p className="font-bold text-gray-800">₹{apt.totalAmount.toFixed(2)}</p><span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${getStatusColor(apt.status)}`}>{apt.status}</span></div></div><div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500"><TagIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{apt.services.join(', ') || 'Details unavailable'}</span></div></div>))) : (<div className="text-center py-8"><ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500 italic">No past appointments found.</p><p className="text-xs text-gray-400 mt-1">This will be their first visit!</p></div>)}
        </div>
      </div>
      {customer.appointmentHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div><div className="text-lg font-bold text-blue-600">{customer.appointmentHistory.length}</div><div className="text-xs text-gray-500">Total Visits</div></div>
            <div><div className="text-lg font-bold text-green-600">₹{customer.appointmentHistory.filter(apt => apt.status === 'Paid').reduce((sum, apt) => sum + apt.totalAmount, 0).toFixed(0)}</div><div className="text-xs text-gray-500">Total Spent</div></div>
          </div>
        </div>)}
    </div>
  );
};


// ===================================================================================
//  MAIN BOOKING FORM COMPONENT
// ===================================================================================
export default function BookAppointmentForm({
  isOpen,
  onClose,
  onBookAppointment
}: BookAppointmentFormProps) {
  // Use a temporary data structure for the form state
const initialFormData: AppointmentFormData = {
  customerId: undefined,
  phoneNumber: '',
  customerName: '',
  email: '',
  gender: '', // The empty string is valid for the initial state
  date: '',
  time: '',
  notes: '',
  status: 'Appointment' as 'Appointment' | 'Checked-In'
};
  
  const [formData, setFormData] = useState<AppointmentFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MODIFIED: State for service assignments
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignmentState[]>([]);

  const [filteredServices, setFilteredServices] = useState<ServiceFromAPI[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const debouncedServiceSearch = useDebounce(serviceSearch, 300);

  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);

  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<CustomerDetails | null>(null);
  const [isLoadingCustomerDetails, setIsLoadingCustomerDetails] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);

  const [customerLookupStatus, setCustomerLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');

  const [barcodeQuery, setBarcodeQuery] = useState<string>('');
  const [isSearchingByBarcode, setIsSearchingByBarcode] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<'phone' | 'barcode'>('phone');

  const [stockIssues, setStockIssues] = useState<any[] | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // NEW: Calculate totals based on assignments
  const calculateTotals = useCallback(() => {
    let total = 0;
    let membershipSavings = 0;
    const isMember = selectedCustomerDetails?.isMember || false;

    serviceAssignments.forEach(assignment => {
      const service = assignment.serviceDetails;
      const hasDiscount = isMember && service.membershipRate;
      const price = hasDiscount ? service.membershipRate! : service.price;
      total += price;
      if (hasDiscount) {
        membershipSavings += service.price - service.membershipRate!;
      }
    });

    return { total, membershipSavings };
  }, [serviceAssignments, selectedCustomerDetails?.isMember]);

  const { total, membershipSavings } = calculateTotals();

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setServiceAssignments([]); // Reset assignments
      setFormError(null);
      setStockIssues(null);
      setIsSubmitting(false);
      setIsCustomerSelected(false);
      setSelectedCustomerDetails(null);
      setCustomerSearchResults([]);
      setShowCustomerHistory(false);
      setBarcodeQuery('');
      setSearchMode('phone');
      setServiceSearch('');
      setFilteredServices([]);
      setCustomerLookupStatus('idle'); // Reset on open
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchServices = async () => {
      try {
        const searchQuery = debouncedServiceSearch ? `&search=${encodeURIComponent(debouncedServiceSearch)}` : '';
        const res = await fetch(`/api/service-items?${searchQuery}`);
        const data = await res.json();
        if (data.success) setFilteredServices(data.services);
        else setFormError('Failed to load services.');
      } catch (e) {
        setFormError('Failed to load services.');
      }
    };
    if (debouncedServiceSearch || serviceSearch === '') {
      fetchServices();
    }
  }, [isOpen, debouncedServiceSearch, serviceSearch]);

  useEffect(() => {
    if (formData.status === 'Checked-In') {
      setFormData(prev => ({ ...prev, date: getCurrentDate(), time: getCurrentTime() }));
    }
  }, [formData.status]);

  // NEW: Update an individual assignment (e.g., select a stylist or add guest name)
  const handleUpdateAssignment = (_tempId: string, updates: Partial<ServiceAssignmentState>) => {
    setServiceAssignments(prev =>
      prev.map(a => (a._tempId === _tempId ? { ...a, ...updates } : a))
    );
  };
  
  // NEW: Fetch available stylists for a single service assignment
  const findStylistsForService = useCallback(async (_tempId: string, serviceId: string) => {
    if (!formData.date || !formData.time) return;
    handleUpdateAssignment(_tempId, { isLoadingStylists: true, availableStylists: [] });
    try {
      const res = await fetch(`/api/stylists/available?date=${formData.date}&time=${formData.time}&serviceIds=${serviceId}`);
     
       const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not fetch stylists.');
      handleUpdateAssignment(_tempId, { availableStylists: data.stylists, isLoadingStylists: false });
    } catch (err: any) {
      toast.error(`Error fetching stylists: ${err.message}`);
      handleUpdateAssignment(_tempId, { isLoadingStylists: false });
    }
  }, [formData.date, formData.time]);

  
  // NEW: useEffect to trigger stylist fetch when date/time or assignments change
  useEffect(() => {
    if(formData.date && formData.time){
        serviceAssignments.forEach(assignment => {
            findStylistsForService(assignment._tempId, assignment.serviceId);
        });
    }
  }, [serviceAssignments.length, formData.date, formData.time, findStylistsForService]);


  useEffect(() => {
    if (searchMode !== 'phone') return;
    const query = formData.phoneNumber.trim();
    if (isCustomerSelected || query.length < 3 || query.length >= 10) { // Don't show dropdown for full number
      setCustomerSearchResults([]); return;
    }
    const handler = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const res = await fetch(`/api/customer/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setCustomerSearchResults(data.customers);
      } catch (error) { console.error('Customer search failed:', error); } 
      finally { setIsSearchingCustomers(false); }
    }, 500);
    return () => clearTimeout(handler);
  }, [formData.phoneNumber, isCustomerSelected, searchMode]);

  // START: MODIFIED handleChange
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    
    if (name === 'phoneNumber') {
        value = value.replace(/[^\d]/g, '');
        setCustomerLookupStatus('idle');
    }

    if (name === 'customerName') {
        // Allow only letters and spaces, remove everything else
        value = value.replace(/[^a-zA-Z\s]/g, '');
    }
    
    if (isCustomerSelected && ['customerName', 'phoneNumber', 'email', 'gender'].includes(name)) {
      handleClearSelection(false);
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  // END: MODIFIED handleChange

  const fetchAndSetCustomerDetails = async (phone: string) => {
    // This check is important to prevent re-fetching if a search is already in progress
    if (isLoadingCustomerDetails) return;

    setIsLoadingCustomerDetails(true);
    setCustomerLookupStatus('searching');
    setCustomerSearchResults([]);
    try {
      const res = await fetch(`/api/customer/search?query=${encodeURIComponent(phone.trim())}&details=true`);
      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        const cust = data.customer;
        setFormData((prev) => ({ ...prev, customerId: cust._id, customerName: cust.name, phoneNumber: cust.phoneNumber, email: cust.email || '', gender: cust.gender || 'other' }));
        setSelectedCustomerDetails(cust);
        setIsCustomerSelected(true);
        setCustomerLookupStatus('found');
      } else {
        setSelectedCustomerDetails(null);
        setIsCustomerSelected(false);
        setCustomerLookupStatus('not_found');
        // Focus on the name field for a new customer
        if (nameInputRef.current) nameInputRef.current.focus();
      }
    } catch (err) {
      setSelectedCustomerDetails(null);
      setIsCustomerSelected(false);
      setCustomerLookupStatus('not_found');
    } finally {
      setIsLoadingCustomerDetails(false);
    }
  };

  useEffect(() => {
    const phone = formData.phoneNumber.trim();

    // Automatically trigger search when a 10-digit number is entered
    if (phone.length === 10 && !isCustomerSelected) {
      fetchAndSetCustomerDetails(phone);
    } 
    // If the user deletes characters, reset the lookup status
    else if (phone.length < 10 && customerLookupStatus !== 'idle') {
      setCustomerLookupStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.phoneNumber, isCustomerSelected]);


  const handleBarcodeSearch = async () => {
    if (!barcodeQuery.trim()) return;
    setIsSearchingByBarcode(true);
    try {
      const res = await fetch(`/api/customer/search-by-barcode?barcode=${encodeURIComponent(barcodeQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        fetchAndSetCustomerDetails(data.customer.phoneNumber);
        setBarcodeQuery(''); toast.success('Customer found by barcode!');
      } else {
        toast.error('No customer found with this barcode'); setBarcodeQuery('');
      }
    } catch (err) { toast.error('Failed to search by barcode'); setBarcodeQuery(''); }
    finally { setIsSearchingByBarcode(false); }
  };

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setFormData(prev => ({ ...prev, customerId: customer._id, customerName: customer.name, phoneNumber: customer.phoneNumber, email: customer.email || '', gender: (customer as any).gender || 'other' }));
    setIsCustomerSelected(true);
    fetchAndSetCustomerDetails(customer.phoneNumber);
  };

  const handleClearSelection = (clearPhone = true) => {
    setIsCustomerSelected(false);
    setSelectedCustomerDetails(null);
    setCustomerLookupStatus('idle'); // Reset the lookup status
    const resetData: Partial<typeof formData> = { customerId: undefined, customerName: '', email: '', gender: '' };
    if (clearPhone) {
      resetData.phoneNumber = ''; setBarcodeQuery('');
      if (searchMode === 'phone' && phoneInputRef.current) phoneInputRef.current.focus();
      else if (searchMode === 'barcode' && barcodeInputRef.current) barcodeInputRef.current.focus();
    } else {
      if (nameInputRef.current) nameInputRef.current.focus();
    }
    setFormData((prev) => ({ ...prev, ...resetData }));
  };

  const handleToggleMembership = async (customBarcode?: string) => {
    if (!selectedCustomerDetails) return;
    try {
      const response = await fetch(`/api/customer/${selectedCustomerDetails._id}/toggle-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMembership: !selectedCustomerDetails.isMember, membershipBarcode: customBarcode })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(selectedCustomerDetails.isMember ? 'Membership removed successfully!' : `Membership granted successfully with barcode: ${result.customer.membershipBarcode}`);
        setTimeout(() => fetchAndSetCustomerDetails(selectedCustomerDetails.phoneNumber), 300);
      } else {
        toast.error(result.message || 'Failed to update membership status');
      }
    } catch (error) {
      toast.error('Failed to update membership status');
    }
  };
  
  // NEW: Handler to add a new service assignment
  const handleAddService = (service: ServiceFromAPI) => {
    if (service && !serviceAssignments.some((a) => a.serviceId === service._id)) {
        const newAssignment: ServiceAssignmentState = {
            _tempId: Date.now().toString(),
            serviceId: service._id,
            stylistId: '', // Initially unassigned
            serviceDetails: service,
            availableStylists: [],
            isLoadingStylists: true,
        };
        setServiceAssignments(prev => [...prev, newAssignment]);
        setServiceSearch('');
    }
  };

  // NEW: Handler to remove a service assignment by its temporary ID
  const handleRemoveService = (_tempId: string) => {
    setServiceAssignments(prev => prev.filter(a => a._tempId !== _tempId));
  };


  // MODIFIED: Submit handler to construct the new data payload
  // The NEW handleSubmit function
const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setStockIssues(null); // Clear previous stock issues

    const { phoneNumber, customerName, date, time, status, gender } = formData;

    // --- Step 1: Initial Form Validation (same as before) ---
    if (!phoneNumber || !customerName || !date || !time || !status || !gender) {
        setFormError('Please fill in all customer and schedule details.');
        return;
    }
    if (serviceAssignments.length === 0) {
        setFormError('Please add at least one service.');
        return;
    }
    if (serviceAssignments.some(a => !a.stylistId)) {
        setFormError('A stylist must be assigned to every service.');
        return;
    }

    setIsSubmitting(true);
    try {
        // --- Step 2: PRE-CHECK CONSUMABLE STOCK ---
        const checkPayload = {
            serviceIds: serviceAssignments.map(a => a.serviceId),
            customerGender: formData.gender as 'male' | 'female' | 'other',
        };

        const checkRes = await fetch('/api/appointment/check-consumables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkPayload),
        });

        const checkData = await checkRes.json();

        if (!checkRes.ok || !checkData.success) {
            throw new Error(checkData.message || "Failed to check stock availability.");
        }

        // If booking is not possible, show the specific issues and stop.
if (checkData.canBook === false) {
    // --- THIS IS THE NEW LINE ---
      toast.error("Cannot book: Required items are out of stock. See details below.");
            setStockIssues(checkData.issues);
            setIsSubmitting(false);
            return;
        }

        // --- Step 3: PROCEED WITH ACTUAL BOOKING (if check passed) ---
        const finalAssignments = serviceAssignments.map(a => ({
            serviceId: a.serviceId,
            stylistId: a.stylistId,
            guestName: a.guestName || undefined,
        }));

        const appointmentData: NewBookingData = {
            ...formData,
            serviceAssignments: finalAssignments,
            appointmentType: formData.status === 'Checked-In' ? 'Offline' : 'Online'
        };
        
        await onBookAppointment(appointmentData);
        // The `onBookAppointment` function should handle success toasts and closing the modal.

    } catch (error: any) {
        setFormError(error.message || 'An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
};

  if (!isOpen) return null;

  const inputBaseClasses = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/30 text-sm';
  const fieldsetClasses = 'border border-gray-200 p-4 rounded-lg';
  const legendClasses = 'text-base font-semibold text-gray-800 px-2 -ml-2';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 md:p-8 max-w-6xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <h2 className="text-2xl font-bold">Book New Appointment</h2>
            <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
          </div>

          <div className="flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-x-8">
            <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2 flex flex-col">
              <div className="space-y-6 flex-grow">
                {formError && (<div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{formError}</div>)}
  {stockIssues && stockIssues.length > 0 && (
  <div className="my-4 p-4 border-l-4 border-orange-500 bg-orange-50 text-orange-800 rounded-r-lg">
    <h4 className="font-bold">Cannot Book: Insufficient Consumables</h4>
    <p className="text-sm mt-1">The following items are required for the selected services but are low on stock:</p>
    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
      {stockIssues.map((issue, index) => (
        <li key={index}>
          <strong>{issue.productName}</strong>: Requires {issue.required}{issue.unit}, but only {issue.available}{issue.unit} available.
        </li>
      ))}
    </ul>
  </div>
)}
                <fieldset className={fieldsetClasses}>
                  <legend className={legendClasses}>Customer Information</legend>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button type="button" onClick={() => setSearchMode('phone')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${searchMode === 'phone' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Phone Search</button>
                      <button type="button" onClick={() => setSearchMode('barcode')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${searchMode === 'barcode' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Barcode Search</button>
                    </div>
                    <div className="text-xs text-gray-500">Switch between phone number search and membership barcode scan</div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-5 mt-3">
                    {searchMode === 'phone' ? (
                      <div className="md:col-span-2 relative">
                        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                        <input 
                          ref={phoneInputRef} 
                          id="phoneNumber" 
                          type="tel" 
                          name="phoneNumber" 
                          value={formData.phoneNumber} 
                          onChange={handleChange} 
                          required 
                          placeholder="Enter 10-digit phone to find or create..." 
                          className={inputBaseClasses} 
                          autoComplete="off"
                          maxLength={10}
                        />
                        
                        {(isSearchingCustomers || customerSearchResults.length > 0) ? (
                            <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {isSearchingCustomers ? (
                                    <li className="px-3 py-2 text-sm text-gray-500">Searching...</li>
                                ) : (
                                    customerSearchResults.map((cust) => (
                                        <li key={cust._id} onClick={() => handleSelectCustomer(cust)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{cust.name} - <span className="text-gray-500">{cust.phoneNumber}</span></li>
                                    ))
                                )}
                            </ul>
                        ) : (
                             <div className="h-5 mt-1 text-xs">
                                {customerLookupStatus === 'searching' && <span className="text-gray-500 flex items-center gap-1.5"><div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />Checking for existing customer...</span>}
                                {customerLookupStatus === 'found' && <span className="font-semibold text-green-600">✓ Customer Found. Details loaded below.</span>}
                                {customerLookupStatus === 'not_found' && <span className="font-medium text-blue-600">Customer not found. Please fill in their details.</span>}
                             </div>
                        )}
                      </div>
                    ) : (
                      <div className="md:col-span-2 relative"><label htmlFor="barcodeQuery" className="block text-sm font-medium mb-1.5">Membership Barcode <span className="text-red-500">*</span></label><div className="flex gap-2"><div className="relative flex-grow"><input ref={barcodeInputRef} id="barcodeQuery" type="text" value={barcodeQuery} onChange={(e) => setBarcodeQuery(e.target.value.toUpperCase())} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeSearch(); } }} placeholder="Scan or enter membership barcode..." className={`${inputBaseClasses} uppercase`} autoComplete="off" /><QrCodeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /></div><button type="button" onClick={handleBarcodeSearch} disabled={isSearchingByBarcode || !barcodeQuery.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">{isSearchingByBarcode ? (<><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Searching...</>) : ('Search')}</button></div><p className="text-xs text-gray-500 mt-1">Members can scan their barcode to quickly load their information</p></div>
                    )}
                    <div><label htmlFor="customerName" className="block text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label><input ref={nameInputRef} id="customerName" type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className={`${inputBaseClasses} ${isCustomerSelected ? 'bg-gray-100' : ''}`} disabled={isCustomerSelected}/></div>
                    <div><label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label><input id="email" type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputBaseClasses} ${isCustomerSelected ? 'bg-gray-100' : ''}`} disabled={isCustomerSelected}/></div>
                    <div><label htmlFor="gender" className="block text-sm font-medium mb-1.5">Gender <span className="text-red-500">*</span></label><select id="gender" name="gender" value={formData.gender || ''} onChange={handleChange} required className={`${inputBaseClasses} ${isCustomerSelected ? 'bg-gray-100' : ''}`} disabled={isCustomerSelected}><option value="" disabled>Select Gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></div>
                  </div>
                  {isCustomerSelected && (<div className="mt-3 flex items-center justify-between"><button type="button" onClick={() => handleClearSelection(true)} className="text-xs text-blue-600 hover:underline">Clear Selection & Add New</button>{selectedCustomerDetails?.membershipBarcode && (<div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1"><QrCodeIcon className="w-3 h-3" />Barcode: {selectedCustomerDetails.membershipBarcode}</div>)}</div>)}
                </fieldset>

                <fieldset className={fieldsetClasses}>
                  <legend className={legendClasses}>Schedule & Service</legend>
                  <div className="mt-3"><label htmlFor="status" className="block text-sm font-medium mb-1.5">Status <span className="text-red-500">*</span></label><select id="status" name="status" value={formData.status} onChange={handleChange} className={inputBaseClasses}><option value="Appointment">Appointment (Online Booking)</option><option value="Checked-In">Checked-In (Walk-in Customer)</option></select>{formData.status === 'Checked-In' && (<p className="text-sm text-gray-500 mt-1">Service starts now at {formatTimeIST(formData.time)} on {formatDateIST(formData.date)}.</p>)}</div>
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                    <div><label htmlFor="date" className="block text-sm font-medium mb-1.5">Date <span className="text-red-500">*</span></label><input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required className={`${inputBaseClasses} ${formData.status === 'Checked-In' ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={formData.status === 'Checked-In'}/></div>
                    <div><label htmlFor="time" className="block text-sm font-medium mb-1.5">Time <span className="text-red-500">*</span></label><input id="time" type="time" name="time" value={formData.time} onChange={handleChange} required className={`${inputBaseClasses} ${formData.status === 'Checked-In' ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={formData.status === 'Checked-In'}/></div>
                  </div>
                  <div className="mt-5"><label className="block text-sm font-medium mb-1.5">Add Services <span className="text-red-500">*</span></label><div className="relative"><input type="text" value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Search for services..." className={`${inputBaseClasses} pr-8`} />{serviceSearch && filteredServices.length > 0 && (<ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">{filteredServices.map((service) => (<li key={service._id} onClick={() => handleAddService(service)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{service.name} - ₹{service.price}{service.membershipRate && ` (Member: ₹${service.membershipRate})`}</li>))}</ul>)}</div></div>

                  {/* MODIFIED: Render Service Assignment Cards */}
                  <div className="mt-4 space-y-4">
                    {serviceAssignments.map((assignment, index) => (
                      <div key={assignment._tempId} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="font-semibold text-gray-800">
                                {index + 1}. {assignment.serviceDetails.name}
                                <span className="ml-2 text-xs font-normal text-gray-500">({assignment.serviceDetails.duration} mins)</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveService(assignment._tempId)} className="p-1 text-red-500 hover:bg-red-100 rounded-full" title="Remove Service"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t">
                            <div>
                                <label htmlFor={`guestName-${assignment._tempId}`} className="block text-xs font-medium text-gray-600 mb-1">Service For</label>
                                <input type="text" id={`guestName-${assignment._tempId}`} placeholder={formData.customerName || "Main Customer"} value={assignment.guestName || ''} onChange={(e) => handleUpdateAssignment(assignment._tempId, { guestName: e.target.value })} className={`${inputBaseClasses} py-2 text-sm`} />
                                <p className="text-xs text-gray-400 mt-1">E.g., "John Jr. (Son)". Leave blank for primary.</p>
                            </div>
                            <div>
                                <label htmlFor={`stylist-${assignment._tempId}`} className="block text-xs font-medium text-gray-600 mb-1">Assigned Stylist <span className="text-red-500">*</span></label>
                                <select id={`stylist-${assignment._tempId}`} value={assignment.stylistId} onChange={(e) => handleUpdateAssignment(assignment._tempId, { stylistId: e.target.value })} required disabled={!formData.date || !formData.time || assignment.isLoadingStylists} className={`${inputBaseClasses} py-2 text-sm disabled:bg-gray-100/80`}>
                                    <option value="" disabled>{assignment.isLoadingStylists ? 'Finding stylists...' : 'Select a stylist'}</option>
                                    {assignment.availableStylists.length > 0 ? (
                                        assignment.availableStylists.map((s) => (<option key={s._id} value={s._id}>{s.name}</option>))
                                    ) : (
                                        !assignment.isLoadingStylists && <option disabled>No stylists available</option>
                                    )}
                                </select>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {serviceAssignments.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">₹{total.toFixed(2)}</span>
                          {membershipSavings > 0 && (<div className="text-xs text-green-500 mt-1">Saved ₹{membershipSavings.toFixed(2)} with membership</div>)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-5"><label htmlFor="notes" className="block text-sm font-medium mb-1.5">Notes</label><textarea id="notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className={`${inputBaseClasses} resize-none`} placeholder="Any special requirements or notes..."/></div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-auto">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm bg-white border rounded-lg hover:bg-gray-50" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm text-white bg-gray-800 rounded-lg hover:bg-black flex items-center justify-center min-w-[150px]" disabled={isSubmitting}>{isSubmitting ? (<div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />) : ('Book Appointment')}</button>
              </div>

              
            </form>

            <div className="lg:col-span-1 lg:border-l lg:pl-8 mt-8 lg:mt-0">
              <CustomerDetailPanel customer={selectedCustomerDetails} isLoading={isLoadingCustomerDetails} onToggleMembership={handleToggleMembership} onViewFullHistory={() => setShowCustomerHistory(true)} />
            </div>
          </div>
        </div>
      </div>

      <CustomerHistoryModal isOpen={showCustomerHistory} onClose={() => setShowCustomerHistory(false)} customer={selectedCustomerDetails} />
    </>
  );
}