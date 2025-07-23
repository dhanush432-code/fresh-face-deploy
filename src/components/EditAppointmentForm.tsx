// /components/EditAppointmentForm.tsx - FINAL CORRECTED VERSION
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronDownIcon, CurrencyRupeeIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';

// Interfaces remain the same
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

// 1. UPDATE THE INTERFACE TO MATCH THE NEW DATA STRUCTURE
interface AppointmentForEdit {
  id: string;
  customerId: {
    _id: string;
    name: string;
    phoneNumber?: string;
    isMembership?: boolean;
  };
  stylistId: StylistFromAPI;
  serviceIds?: ServiceFromAPI[];
  appointmentDateTime: string; // <-- USE THE NEW FIELD
  notes?: string;
  status: string;
  appointmentType: string;
  estimatedDuration?: number;
  finalAmount?: number;
  membershipDiscount?: number;
}

interface EditAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentForEdit | null;
  onUpdateAppointment: (appointmentId: string, updateData: any) => Promise<void>;
}

export default function EditAppointmentForm({
  isOpen,
  onClose,
  appointment,
  onUpdateAppointment
}: EditAppointmentFormProps) {
  const [formData, setFormData] = useState({
    serviceIds: [] as string[],
    stylistId: '',
    date: '',
    time: '',
    notes: '',
    status: '',
  });

  const [allServices, setAllServices] = useState<ServiceFromAPI[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceFromAPI[]>([]);
  const [availableStylists, setAvailableStylists] = useState<StylistFromAPI[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotals = useCallback(() => {
    let total = 0;
    let membershipSavings = 0;
    const isMember = appointment?.customerId?.isMembership || false;

    selectedServices.forEach(service => {
      const hasDiscount = isMember && service.membershipRate;
      const price = hasDiscount ? service.membershipRate! : service.price;
      total += price;
      if (hasDiscount) {
        membershipSavings += service.price - service.membershipRate!;
      }
    });

    return { total, membershipSavings };
  }, [selectedServices, appointment?.customerId?.isMembership]);

  const { total, membershipSavings } = calculateTotals();

  // Initialize form when appointment changes
  useEffect(() => {
    if (!isOpen || !appointment) return;

    // 2. THIS IS THE CORE FIX: Derive date and time from the single correct field
    const appointmentDate = new Date(appointment.appointmentDateTime);
    
    // Format to YYYY-MM-DD for the date input
    const datePart = appointmentDate.toISOString().split('T')[0];
    
    // Format to HH:mm for the time input, being careful about timezone conversion
    const hours = String(appointmentDate.getHours()).padStart(2, '0');
    const minutes = String(appointmentDate.getMinutes()).padStart(2, '0');
    const timePart = `${hours}:${minutes}`;

    setFormData({
      serviceIds: appointment.serviceIds?.map(s => s._id) || [],
      stylistId: appointment.stylistId._id,
      date: datePart, // Use the derived date part
      time: timePart, // Use the derived time part
      notes: appointment.notes || '',
      status: appointment.status,
    });

    setSelectedServices(appointment.serviceIds || []);
    setError(null);

    const fetchServices = async () => {
      try {
        const res = await fetch('/api/service-items');
        const data = await res.json();
        if (data.success) {
          setAllServices(data.services);
        }
      } catch (e) {
        console.error('Failed to fetch services:', e);
      }
    };

    fetchServices();
  }, [isOpen, appointment]);

  // The rest of the component handlers (findAvailableStylists, etc.) are fine
  const findAvailableStylists = useCallback(async () => {
    if (!formData.date || !formData.time || formData.serviceIds.length === 0) {
      setAvailableStylists([appointment?.stylistId || { _id: '', name: 'Current Stylist' }] as StylistFromAPI[]);
      return;
    }

    setIsLoadingStylists(true);
    try {
      const serviceQuery = formData.serviceIds.map((id) => `serviceIds=${id}`).join('&');
      const res = await fetch(`/api/stylists/available?date=${formData.date}&time=${formData.time}&${serviceQuery}&appointmentId=${appointment?.id}`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not fetch stylists.');
      }

      const currentStylistInList = data.stylists.some((s: any) => s._id === appointment?.stylistId._id);
      if (!currentStylistInList && appointment?.stylistId) {
        data.stylists.unshift(appointment.stylistId);
      }

      setAvailableStylists(data.stylists);
    } catch (err: any) {
      setError(err.message);
      setAvailableStylists([appointment?.stylistId || { _id: '', name: 'Current Stylist' }] as StylistFromAPI[]);
    } finally {
      setIsLoadingStylists(false);
    }
  }, [formData.date, formData.time, formData.serviceIds, appointment]);

  useEffect(() => {
    findAvailableStylists();
  }, [findAvailableStylists]);

  const handleAddService = (serviceId: string) => {
    if (!serviceId) return;
    const serviceToAdd = allServices.find((s) => s._id === serviceId);
    if (serviceToAdd && !selectedServices.some((s) => s._id === serviceId)) {
      const newSelected = [...selectedServices, serviceToAdd];
      setSelectedServices(newSelected);
      setFormData(prev => ({
        ...prev,
        serviceIds: newSelected.map((s) => s._id)
      }));
    }
  };

  const handleRemoveService = (serviceId: string) => {
    const newSelected = selectedServices.filter((s) => s._id !== serviceId);
    setSelectedServices(newSelected);
    setFormData(prev => ({
      ...prev,
      serviceIds: newSelected.map((s) => s._id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    setIsSubmitting(true);
    setError(null);

    // The payload is correct. It sends separate date/time, which the PUT API handles.
    const updatePayload = {
      ...formData,
      appointmentType: appointment.appointmentType
    };

    try {
      await onUpdateAppointment(appointment.id, updatePayload);
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/30 text-sm';

  // JSX rendering remains largely the same
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold">Edit Appointment</h2>
            <p className="text-sm text-gray-600 mt-1">
              {appointment.customerId.name} - {appointment.customerId.phoneNumber}
              {appointment.customerId.isMembership && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                  Member
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (<div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>)}

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CurrencyRupeeIcon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Appointment Total:</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">₹{total.toFixed(2)}</div>
                {membershipSavings > 0 && (<div className="text-xs text-green-500">Member savings: ₹{membershipSavings.toFixed(2)}</div>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} className={inputClasses}>
                <option value="Appointment">Appointment</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No-Show">No-Show</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={appointment.appointmentType} className={`${inputClasses} bg-gray-100`} disabled>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))} className={inputClasses} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Services</label>
            <select
              onChange={(e) => { handleAddService(e.target.value); e.target.value = ''; }}
              value=""
              className={inputClasses}
            >
              <option value="">Add a service...</option>
              {allServices.map((service) => (
                <option key={service._id} value={service._id} disabled={selectedServices.some((s) => s._id === service._id)}>
                  {service.name} - ₹{service.price}
                  {appointment.customerId.isMembership && service.membershipRate && ` (Member: ₹${service.membershipRate})`}
                </option>
              ))}
            </select>
            <div className="mt-2 space-y-2">
              {selectedServices.map((service) => {
                const isMember = appointment.customerId.isMembership;
                const showMemberPrice = isMember && service.membershipRate;
                const finalPrice = showMemberPrice ? service.membershipRate! : service.price;
                
                return (
                  <div key={service._id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                    <div>
                      <span className="font-medium text-sm">{service.name}</span>
                      <span className="text-xs text-gray-600 ml-2">({service.duration} min)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {showMemberPrice ? (
                        <div className="text-right">
                          <div className="line-through text-gray-400 text-xs">₹{service.price}</div>
                          <div className="text-green-600 font-semibold">₹{finalPrice}</div>
                        </div>
                      ) : (
                        <span>₹{service.price}</span>
                      )}
                      <button type="button" onClick={() => handleRemoveService(service._id)} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stylist</label>
            <select value={formData.stylistId} onChange={(e) => setFormData(prev => ({ ...prev, stylistId: e.target.value }))} className={inputClasses} disabled={isLoadingStylists} required>
              {isLoadingStylists ? (<option>Loading stylists...</option>) : (
                availableStylists.map((stylist) => (
                  <option key={stylist._id} value={stylist._id}>
                    {stylist.name}
                    {stylist._id === appointment.stylistId._id && ' (Current)'}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea rows={3} value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} className={`${inputClasses} resize-none`} placeholder="Any special notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 min-w-[120px]" disabled={isSubmitting || selectedServices.length === 0}>
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Updating...
                </div>
              ) : ( formData.status === 'Checked-Out' ? 'Update & Proceed to Bill' : 'Update Appointment' )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}