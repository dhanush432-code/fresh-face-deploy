'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserPlusIcon, ClockIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import { QrCodeIcon } from 'lucide-react';

// This is a static ID for the membership fee item, used for identification. The price is dynamic.
const MEMBERSHIP_FEE_ITEM_ID = 'MEMBERSHIP_FEE_PRODUCT_ID';

// --- TYPE DEFINITIONS ---
export interface BillLineItem {
  itemType: 'service' | 'product' | 'fee';
  itemId: string;
  name: string;
  unitPrice: number;
  membershipRate?: number;
  quantity: number;
  finalPrice: number;
   isRemovable?: boolean;
}

interface SearchableItem {
  id: string;
  name: string;
  price: number;
  membershipRate?: number;
  type: 'service' | 'product' | 'fee';
  categoryName?: string; // For product category display
  unit?: string; // For product unit display
}

interface AppointmentForModal {
  _id: string;
  id: string;
  serviceIds?: Array<{ _id: string; name: string; price: number; membershipRate?: number }>;
}

interface CustomerForModal {
  _id: string;
  id: string;
  name: string;
  phoneNumber?: string;
  isMembership?: boolean;
}

interface StylistForModal {
  _id: string;
  id: string;
  name: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
}

export interface FinalizeBillingPayload {
  appointmentId: string;
  customerId: string;
  stylistId: string;
  billingStaffId: string;
  items: BillLineItem[];
  serviceTotal: number;
  productTotal: number;
  subtotal: number;
  membershipDiscount: number;
  grandTotal: number;
  paymentDetails: { cash: number; card: number; upi: number; other: number };
  notes: string;
  customerWasMember: boolean;
  membershipGrantedDuringBilling: boolean;
  manualDiscountType: 'fixed' | 'percentage' | null;
  manualDiscountValue: number;
  finalManualDiscountApplied: number;
}

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentForModal;
  customer: CustomerForModal;
  stylist: StylistForModal;
  onFinalizeAndPay: (payload: FinalizeBillingPayload) => Promise<void>;
}

interface AppointmentHistoryItem {
  _id: string;
  appointmentDateTime: string;
  serviceIds: Array<{ name: string }>;
  stylistId: { name: string };
  status: 'Appointment' | 'Checked-In' | 'Checked-Out' | 'Paid' | 'Cancelled' | 'No-Show';
  finalAmount?: number;
}

interface CustomerDetailsWithHistory {
  appointmentHistory: AppointmentHistoryItem[];
  loyaltyPoints?: number;
  isMembership?: boolean;
}


// --- CUSTOMER HISTORY MODAL ---
const CustomerHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerForModal | null;
}> = ({ isOpen, onClose, customer }) => {
  const [customerDetails, setCustomerDetails] = useState<CustomerDetailsWithHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomerHistory = useCallback(async () => {
    if (!customer?.phoneNumber) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customer/search?query=${customer.phoneNumber}&details=true`);
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomerDetails(data.customer);
      }
    } catch (error) {
      console.error('Failed to fetch customer history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customer?.phoneNumber]);

  useEffect(() => {
    if (isOpen && customer?.phoneNumber) {
      fetchCustomerHistory();
    }
  }, [isOpen, customer?.phoneNumber, fetchCustomerHistory]);


  if (!isOpen) return null;

  const getStatusColor = (status: AppointmentHistoryItem['status']) => {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold">Customer History - {customer?.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">
            ×
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8">Loading history...</div>
        ) : customerDetails ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{customerDetails.appointmentHistory.length}</div>
                <div className="text-sm text-gray-600">Total Visits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{customerDetails.appointmentHistory
                    .filter((apt) => apt.status === 'Paid')
                    .reduce((sum, apt) => sum + (apt.finalAmount || 0), 0)
                    .toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{customerDetails.loyaltyPoints || 0}</div>
                <div className="text-sm text-gray-600">Loyalty Points</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${customerDetails.isMembership ? 'text-green-600' : 'text-gray-400'}`}>
                  {customerDetails.isMembership ? 'YES' : 'NO'}
                </div>
                <div className="text-sm text-gray-600">Member</div>
              </div>
            </div>
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
                  {customerDetails.appointmentHistory.map((apt) => (
                    <tr key={apt._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{new Date(apt.appointmentDateTime).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{apt.serviceIds.map((s) => s.name).join(', ') || 'N/A'}</td>
                      <td className="px-4 py-3">{apt.stylistId.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">₹{(apt.finalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No history found for this phone number.</div>
        )}
      </div>
    </div>
  );
};


// --- MAIN BILLING MODAL ---
const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  onClose,
  appointment,
  customer,
  stylist,
  onFinalizeAndPay
}) => {
  const [billItems, setBillItems] = useState<BillLineItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryImpact, setInventoryImpact] = useState<any>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [customerIsMember, setCustomerIsMember] = useState<boolean>(false);
  const [showMembershipGrantOption, setShowMembershipGrantOption] = useState<boolean>(false);
  const [isGrantingMembership, setIsGrantingMembership] = useState<boolean>(false);
  const [membershipGranted, setMembershipGranted] = useState<boolean>(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState<boolean>(false);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false);
  const [paymentDetails, setPaymentDetails] = useState({ cash: 0, card: 0, upi: 0, other: 0 });
  const [membershipBarcode, setMembershipBarcode] = useState<string>('');
  const [isBarcodeValid, setIsBarcodeValid] = useState<boolean>(true);
  const [isCheckingBarcode, setIsCheckingBarcode] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  
  const [membershipFee, setMembershipFee] = useState<number | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState<boolean>(true);

  const fetchMembershipFee = useCallback(async () => {
    setIsLoadingFee(true);
    try {
      const res = await fetch('/api/settings/membership');
      if (!res.ok) throw new Error('Could not fetch membership fee setting.');
      const data = await res.json();
      if (data.success && typeof data.price === 'number') {
        setMembershipFee(data.price);
      } else {
        throw new Error(data.message || 'Failed to get fee price.');
      }
    } catch (err: any) {
      console.error('Membership Fee Fetch Error:', err.message);
      setError('Error: Membership fee is not configured. Please contact admin.');
      setMembershipFee(null);
    } finally {
      setIsLoadingFee(false);
    }
  }, []);

  const fetchStaffMembers = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const res = await fetch('/api/users/billing-staff');
      const data = await res.json();
      if (data.success) {
        setAvailableStaff(data.staff);
        if (data.staff.some((s: StaffMember) => s._id === stylist._id)) {
          setSelectedStaffId(stylist._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  }, [stylist._id]);
  
  const fetchInventoryImpact = useCallback(async (currentBillItems: BillLineItem[]) => {
    const serviceItems = currentBillItems.filter(item => item.itemType === 'service');
    if (serviceItems.length === 0 || !customer._id) {
      setInventoryImpact(null);
      return;
    }
    setIsLoadingInventory(true);
    try {
      const serviceIds = serviceItems.map(s => s.itemId);
      const response = await fetch('/api/billing/inventory-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds, customerId: customer._id })
      });
      const data = await response.json();
      if (data.success) setInventoryImpact(data.data);
    } catch (err) {
      console.error('Failed to fetch inventory impact:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [customer._id]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes('');
      setSearchQuery('');
      setSearchResults([]);
      setMembershipGranted(false);
      setIsGrantingMembership(false);
      setSelectedStaffId('');
      setPaymentDetails({ cash: 0, card: 0, upi: 0, other: 0 });
      setInventoryImpact(null);
      setDiscount(0);
      setDiscountType('fixed');
      
      fetchStaffMembers();
      fetchMembershipFee();
      
      const isMember = customer?.isMembership || false;
      setCustomerIsMember(isMember);
      setShowMembershipGrantOption(!isMember);
      
      const initialItems = appointment.serviceIds?.map(service => {
        const finalPrice = (isMember && typeof service.membershipRate === 'number')
          ? service.membershipRate : service.price;
        return {
          itemType: 'service' as const,
          itemId: service._id,
          name: service.name,
          unitPrice: service.price,
          membershipRate: service.membershipRate,
          quantity: 1,
          finalPrice: finalPrice,
        };
      }) ?? [];

      setBillItems(initialItems);
      if (initialItems.length > 0) {
        fetchInventoryImpact(initialItems);
      }
    }
  }, [isOpen, appointment, customer, fetchStaffMembers, fetchInventoryImpact, fetchMembershipFee]);

  useEffect(() => {
    setBillItems(prevItems =>
      prevItems.map(item => {
        if (item.itemType === 'service') {
          const unitPrice = (customerIsMember && typeof item.membershipRate === 'number')
            ? item.membershipRate : item.unitPrice;
          return { ...item, finalPrice: unitPrice * item.quantity };
        }
        return item;
      })
    );
  }, [customerIsMember]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/billing/search-items?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.items);
      } catch (e) {
        console.error('Item search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!membershipBarcode.trim()) {
      setIsBarcodeValid(true);
      return;
    }
    const handler = setTimeout(async () => {
      setIsCheckingBarcode(true);
      try {
        const res = await fetch(`/api/customer/check-barcode?barcode=${encodeURIComponent(membershipBarcode.trim())}`);
        const data = await res.json();
        setIsBarcodeValid(!data.exists);
      } catch (err) {
        setIsBarcodeValid(false);
      } finally {
        setIsCheckingBarcode(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [membershipBarcode]);

  const handleAddItemToBill = (item: SearchableItem) => {
    if (billItems.some(bi => bi.itemId === item.id)) {
      toast.info(`${item.name} is already in the bill.`);
      return;
    }
    const finalPrice = (customerIsMember && item.type === 'service' && typeof item.membershipRate === 'number')
      ? item.membershipRate : item.price;

    let displayName = item.name;
    if (item.type === 'product') {
      if (item.categoryName) {
        displayName = `${item.categoryName} - ${displayName}`;
      }
      if (item.unit) {
        displayName = `${displayName} (${item.unit})`;
      }
    }
    
    const newItem: BillLineItem = {
      itemType: item.type,
      itemId: item.id,
      name: displayName,
      unitPrice: item.price,
      membershipRate: item.membershipRate,
      quantity: 1,
      finalPrice: finalPrice,
      isRemovable: true,
    };
    const updatedBillItems = [...billItems, newItem];
    setBillItems(updatedBillItems);
    fetchInventoryImpact(updatedBillItems);
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleRemoveItem = (indexToRemove: number) => {
    const updatedBillItems = billItems.filter((_, idx) => idx !== indexToRemove);
    setBillItems(updatedBillItems);
    fetchInventoryImpact(updatedBillItems);
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setBillItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const unitPriceForCalc = (customerIsMember && item.itemType === 'service' && typeof item.membershipRate === 'number')
            ? item.membershipRate : item.unitPrice;
        return { ...item, quantity: newQuantity, finalPrice: unitPriceForCalc * newQuantity };
      }
      return item;
    }));
  };

  const handleGrantMembership = async () => {
    if (isLoadingFee || membershipFee === null) {
      toast.error("Membership fee is still loading or not configured. Please wait or contact an admin.");
      return;
    }
    if (!membershipBarcode.trim() || !isBarcodeValid) {
      setError('Please enter a unique, valid barcode.');
      return;
    }
    if (billItems.some(item => item.itemId === MEMBERSHIP_FEE_ITEM_ID)) {
      toast.info("Membership fee is already in the bill.");
      return;
    }
    try {
      const response = await fetch(`/api/customer/${customer._id}/toggle-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isMembership: true, membershipBarcode: membershipBarcode.trim() })
      });
      const result = await response.json();
      if (result.success) {
        setCustomerIsMember(true);
        setShowMembershipGrantOption(false);
        setMembershipGranted(true);
        setIsGrantingMembership(false);
        toast.success(`Membership granted to ${customer.name}! Fee added to bill.`);
        
        const membershipFeeItem: BillLineItem = {
            itemType: 'fee',
            itemId: MEMBERSHIP_FEE_ITEM_ID,
            name: 'New Membership Fee',
            unitPrice: membershipFee,
            quantity: 1,
            finalPrice: membershipFee,
            isRemovable: false
        };
        setBillItems(prevItems => [...prevItems, membershipFeeItem]);

      } else {
        setError(result.message || 'Failed to grant membership');
      }
    } catch (err) {
      setError('An unexpected error occurred while granting membership.');
    }
  };

  const handlePaymentChange = (method: keyof typeof paymentDetails, amount: string) => {
    setPaymentDetails(prev => ({ ...prev, [method]: parseFloat(amount) || 0 }));
  };

  const totals = useMemo(() => {
    let serviceTotal = 0, productTotal = 0, membershipSavings = 0, feeTotal = 0;
    
    billItems.forEach(item => {
      if (item.itemType === 'service') {
        serviceTotal += item.finalPrice;
        if (customerIsMember && typeof item.membershipRate === 'number') {
          membershipSavings += (item.unitPrice - item.membershipRate) * item.quantity;
        }
      } else if (item.itemType === 'product') {
        productTotal += item.finalPrice;
      } else if (item.itemType === 'fee') {
        feeTotal += item.finalPrice;
      }
    });

    const subtotalBeforeDiscount = serviceTotal + productTotal + feeTotal;
    
    let calculatedDiscount = 0;
    if (discountType === 'fixed') {
        calculatedDiscount = discount;
    } else {
        calculatedDiscount = (subtotalBeforeDiscount * discount) / 100;
    }
    calculatedDiscount = Math.min(subtotalBeforeDiscount, calculatedDiscount);

    const grandTotal = subtotalBeforeDiscount - calculatedDiscount;
    const totalPaid = Object.values(paymentDetails).reduce((sum, amount) => sum + amount, 0);
    const balance = grandTotal - totalPaid;
    
    const changeDue = balance < 0 ? Math.abs(balance) : 0;
    
    return { 
        serviceTotal, 
        productTotal, 
        subtotalBeforeDiscount, 
        grandTotal, 
        membershipSavings, 
        calculatedDiscount, 
        totalPaid, 
        balance,
        changeDue
    };
  }, [billItems, customerIsMember, paymentDetails, discount, discountType]);

  const handleFinalizeClick = async () => {
    if (billItems.length === 0 || totals.grandTotal < 0) {
      setError('Cannot finalize an empty or negative value bill.');
      return;
    }
    if (!selectedStaffId) {
      setError('Please select a billing staff member.');
      return;
    }

    if (totals.balance > 0.01) { 
      setError(`Payment amount (₹${totals.totalPaid.toFixed(2)}) is less than the bill total (₹${totals.grandTotal.toFixed(2)}).`);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      let adjustedPaymentDetails = { ...paymentDetails };

      if (totals.changeDue > 0) {
          const cashPaidForBill = paymentDetails.cash - totals.changeDue;
          adjustedPaymentDetails = {
              ...paymentDetails,
              cash: Math.max(0, cashPaidForBill)
          };
      }

      const finalPayload: FinalizeBillingPayload = {
        appointmentId: appointment._id,
        customerId: customer._id,
        stylistId: stylist._id,
        billingStaffId: selectedStaffId,
        items: billItems,
        serviceTotal: totals.serviceTotal,
        productTotal: totals.productTotal,
        subtotal: totals.subtotalBeforeDiscount,
        membershipDiscount: totals.membershipSavings,
        grandTotal: totals.grandTotal,
        paymentDetails: adjustedPaymentDetails,
        notes,
        customerWasMember: customer?.isMembership || false,
        membershipGrantedDuringBilling: membershipGranted,
        manualDiscountType: discount > 0 ? discountType : null,
        manualDiscountValue: discount,
        finalManualDiscountApplied: totals.calculatedDiscount,
      };
      
      await onFinalizeAndPay(finalPayload);

    } catch (err: any) {
      setError(err.message || "An unknown error occurred during finalization.");
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b">
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Bill for: <span className="text-indigo-600">{customer.name}</span></h2>
                {customer.phoneNumber && <button onClick={() => setShowCustomerHistory(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Customer History"><ClockIcon className="w-5 h-5" /></button>}
              </div>
              <p className="text-sm text-gray-500 mt-1">Service by: <span className="font-medium">{stylist.name}</span>
                {customerIsMember && <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">Member Pricing Applied</span>}
                {membershipGranted && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">Membership Granted</span>}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {showMembershipGrantOption && !customerIsMember && (
                <button
                  onClick={() => setIsGrantingMembership(prev => !prev)}
                  title="Grant Membership"
                  className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 font-semibold transition-all duration-200 border border-yellow-500 text-yellow-700 bg-transparent hover:bg-yellow-50"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span>{isGrantingMembership ? 'Cancel' : 'Grant Membership'}</span>
                </button>
              )}
              <button onClick={onClose} className="text-gray-500 text-2xl hover:text-gray-700">×</button>
            </div>
          </div>
          
          {error && <div className="mb-3 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          
          {isGrantingMembership && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg transition-all">
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-yellow-800 mb-1">Enter Membership Barcode to Grant</label>
                  <div className="relative">
                    <input type="text" value={membershipBarcode} 
                      onChange={(e) => setMembershipBarcode(e.target.value.toUpperCase())} 
                      placeholder="Enter unique barcode" 
                      autoFocus
                      className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 uppercase ${!isBarcodeValid ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} />
                    <QrCodeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {isCheckingBarcode && <p className="text-xs text-gray-500 mt-1">Checking...</p>}
                  {!isBarcodeValid && membershipBarcode.trim() && <p className="text-xs text-red-600 mt-1">Barcode already in use.</p>}
                </div>
                <button 
                  onClick={handleGrantMembership} 
                  disabled={!membershipBarcode.trim() || !isBarcodeValid || isCheckingBarcode || isLoadingFee || membershipFee === null} 
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2 min-w-[200px] justify-center"
                >
                  {isLoadingFee ? 'Loading Fee...' : `Confirm & Grant (₹${membershipFee})`}
                </button>
              </div>
            </div>
          )}

          <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Bill Items ({billItems.length})</h3>
              {billItems.length === 0 ? <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg"><p>No items in bill.</p></div>
              : <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr><th className="px-4 py-3 text-left">Item</th><th className="px-4 py-3 text-center w-24">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center w-24">Action</th></tr>
                    </thead>
                    <tbody>
                      {billItems.map((item, idx) => (
                        <tr key={`${item.itemId}-${idx}`} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className={`ml-2 text-xs capitalize px-1.5 py-0.5 rounded-full ${
                                  item.itemType === 'service' ? 'bg-blue-100 text-blue-800' :
                                  item.itemType === 'product' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                {item.itemType}
                              </span>
                            </div>
                            {customerIsMember && item.itemType === 'service' && typeof item.membershipRate === 'number' && <div className="text-xs text-green-600 mt-1"><span className="line-through text-gray-400">₹{item.unitPrice.toFixed(2)}</span><span className="ml-2">Member Price</span></div>}
                          </td>
                          <td className="px-4 py-3 text-center"><input type="number" min="1" value={item.quantity} onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border rounded text-center" /></td>
                          <td className="px-4 py-3 text-right">₹{((customerIsMember && item.itemType === 'service' && typeof item.membershipRate === 'number') ? item.membershipRate : item.unitPrice).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{item.finalPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemoveItem(idx)} disabled={item.isRemovable === false} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 hover:bg-red-50 rounded disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
            </div>
            
            {isLoadingInventory && <div className="text-sm text-gray-500">Loading inventory preview...</div>}
            {inventoryImpact?.inventoryImpact?.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Inventory Impact ({inventoryImpact.customerGender})</h4>
                <div className="space-y-2">
                  {inventoryImpact.inventoryImpact.map((impact: any, index: number) => (
                    <div key={index} className={`p-3 rounded-md border text-sm ${impact.alertLevel === 'insufficient' ? 'bg-red-50 border-red-200' : impact.alertLevel === 'critical' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex justify-between items-center">
                        <div><span className="font-medium">{impact.productName}</span><div className="text-xs text-gray-600">Current: {impact.currentQuantity.toFixed(1)}{impact.unit} → After: {(impact.currentQuantity - impact.usageQuantity).toFixed(1)}{impact.unit}</div></div>
                        <div className="text-right"><div className="font-medium">-{impact.usageQuantity.toFixed(1)}{impact.unit}</div>{impact.alertLevel !== 'ok' && <div className={`text-xs font-bold ${impact.alertLevel === 'insufficient' ? 'text-red-600' : 'text-orange-600'}`}>{impact.alertLevel.toUpperCase()}!</div>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <label htmlFor="itemSearch" className="block text-sm font-medium text-gray-700 mb-1">Add Additional Items</label>
              <div className="relative"><input ref={searchInputRef} id="itemSearch" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search services or products..." className="w-full px-3 py-2 border rounded-md" autoComplete="off" />
                {(isSearching || searchResults.length > 0) && (
                  <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {isSearching && <li className="px-3 py-2 text-sm text-gray-500">Searching...</li>}
                    {!isSearching && searchResults.map(item => (<li key={item.id} onClick={() => handleAddItemToBill(item)} className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"><div className="flex justify-between items-center"><div><span className="font-medium">{item.type === 'product' && item.categoryName ? `${item.categoryName} - ${item.name}` : item.name}</span><span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${item.type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{item.type}</span></div><div className="text-right"><div>₹{item.price.toFixed(2)}</div>{customerIsMember && item.membershipRate && item.type === 'service' && <div className="text-xs text-green-600">Member: ₹{item.membershipRate.toFixed(2)}</div>}</div></div></li>))}
                    {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && <li className="px-3 py-2 text-sm text-gray-500">No items found.</li>}
                  </ul>)}
              </div>
            </div>

            <div className="pt-4 border-t"><label htmlFor="billingStaff" className="block text-sm font-medium text-gray-700 mb-1">Billing Staff <span className="text-red-500">*</span></label><select id="billingStaff" value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full px-3 py-2 border rounded-md" disabled={isLoadingStaff}><option value="">{isLoadingStaff ? 'Loading staff...' : 'Select billing staff'}</option>{availableStaff.map(staff => <option key={staff._id} value={staff._id}>{staff.name} ({staff.email})</option>)}</select></div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">Manual Discount</label>
              <div className="flex">
                  <div className="relative flex-grow">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          {discountType === 'fixed' ? '₹' : '%'}
                      </span>
                      <input
                          type="number"
                          min="0"
                          value={discount || ''}
                          onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-3 py-2 border border-r-0 border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                      />
                  </div>
                  <button
                      onClick={() => setDiscountType('fixed')}
                      className={`px-4 py-2 text-sm font-semibold border transition-colors ${discountType === 'fixed' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                      Fixed (₹)
                  </button>
                  <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-4 py-2 text-sm font-semibold border border-l-0 rounded-r-md transition-colors ${discountType === 'percentage' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                      Percent (%)
                  </button>
              </div>
            </div>

            <div className="pt-4 border-t"><h4 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h4><div className="grid grid-cols-2 gap-4">{(['cash', 'card', 'upi', 'other'] as const).map(method => (<div key={method}><label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{method}</label><input type="number" min="0" step="0.01" value={paymentDetails[method] || ''} onChange={e => handlePaymentChange(method, e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="0.00" /></div>))}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm col-span-2">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="font-semibold">₹{totals.totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Bill Total:</span>
                <span className="font-semibold">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
              {totals.changeDue > 0 ? (
                <div className="flex justify-between mt-1 text-blue-600 font-bold">
                  <span>Change Due:</span>
                  <span>₹{totals.changeDue.toFixed(2)}</span>
                </div>
              ) : (
                <div className={`flex justify-between mt-1 ${Math.abs(totals.balance) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Balance:</span>
                  <span className="font-bold">₹{totals.balance.toFixed(2)}</span>
                </div>
              )}
            </div></div></div>
            <div className="mt-4"><label htmlFor="billingNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea id="billingNotes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Any additional notes..." /></div>
          </div>


          <div className="mt-auto pt-4 border-t">
            <div className="grid grid-cols-2 gap-8 items-end">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotalBeforeDiscount.toFixed(2)}</span>
                </div>
                {totals.membershipSavings > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                      <span>Membership Savings:</span>
                      <span>-₹{totals.membershipSavings.toFixed(2)}</span>
                  </div>
                )}
                {totals.calculatedDiscount > 0 && (
                  <div className="flex justify-between text-orange-600 font-semibold">
                      <span>Manual Discount:</span>
                      <span>-₹{totals.calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="text-right"><div className="text-gray-600">Grand Total</div><div className="text-3xl font-bold text-gray-900">₹{totals.grandTotal.toFixed(2)}</div></div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300" disabled={isLoading}>Cancel</button>
              <button 
                onClick={handleFinalizeClick} 
                className="px-6 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 min-w-[120px]" 
                disabled={isLoading || billItems.length === 0 || !selectedStaffId || totals.balance > 0.01}
              >
                {isLoading ? <div className="flex items-center justify-center"><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />Processing...</div> : `Complete Payment`}
              </button>
            </div>
          </div>
        </div>
      </div>
      <CustomerHistoryModal isOpen={showCustomerHistory} onClose={() => setShowCustomerHistory(false)} customer={customer} />
    </>
  );
};

export default BillingModal;