// src/app/staffmanagement/staff/editstaff/page.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, Save, Upload, PlusCircle, XCircle, User, Mail, Phone, 
    Fingerprint, Briefcase, Calendar, IndianRupee, MapPin, Activity,
    Badge, Eye, Trash2, FileText, Banknote, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useStaff, StaffMember, UpdateStaffPayload, PositionOption } from '../../../../../context/StaffContext';
import Button from '../../../../../components/ui/Button';

// ... (Interfaces and other components remain the same) ...

interface EditStaffFormData {
  staffIdNumber: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  joinDate: string;
  salary: string;
  address: string;
  image: string | null;
  status: 'active' | 'inactive';
  aadharNumber: string;
  aadharImage: string | null;
  passbookImage: string | null;
  agreementImage: string | null;
}

const DEFAULT_STAFF_IMAGE = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d1d5db'%3e%3cpath fill-rule='evenodd' d='M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' clip-rule='evenodd' /%3e%3c/svg%3e`;

const DocumentViewerModal: React.FC<{ src: string | null; title: string; onClose: () => void; }> = ({ src, title, onClose }) => {
    if (!src) return null;
    return (
      <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <Button variant="ghost" onClick={onClose}><XCircle /></Button>
          </div>
          <div className="p-4">
            <img src={src} alt={title} className="w-full h-auto object-contain" />
          </div>
        </div>
      </div>
    );
  };
  
  const FileUploadInput: React.FC<{
    id: string;
    label: string;
    icon: React.ReactNode;
    fileData: string | null;
    onFileChange: (file: string | null) => void;
    onView: () => void;
    isSubmitting: boolean;
  }> = ({ id, label, icon, fileData, onFileChange, onView, isSubmitting }) => {
    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { 
          toast.error("File size should not exceed 5MB.");
          e.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          onFileChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
  
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
        </label>
        <div className="mt-1 flex items-center gap-3 p-3 border border-gray-300 rounded-md">
          <input type="file" id={id} accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" disabled={isSubmitting} />
          {fileData ? (
            <>
              <FileText className="h-8 w-8 text-indigo-500 flex-shrink-0" />
              <div className="flex-grow text-sm text-gray-700">File uploaded.</div>
              <Button type="button" variant="outline" size="sm" icon={<Eye size={14}/>} onClick={onView} disabled={isSubmitting}>View</Button>
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 size={14}/>} onClick={() => onFileChange(null)} className="text-red-500" title="Remove File" disabled={isSubmitting} />
            </>
          ) : (
            <>
              <Button type="button" variant="outline" icon={<Upload size={16}/>} onClick={() => document.getElementById(id)?.click()} disabled={isSubmitting}>
                Upload File
              </Button>
              <p className="text-xs text-gray-500">Max 5MB</p>
            </>
          )}
        </div>
      </div>
    );
  };


const EditStaffContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const staffId = searchParams.get('staffId');

  const {
    updateStaffMember,
    positionOptions: contextPositionOptions = [],
    addPositionOption
  } = useStaff();

  const [formData, setFormData] = useState<EditStaffFormData>({
    staffIdNumber: '', name: '', email: '', phone: '', position: '',
    joinDate: '', salary: '', address: '', image: DEFAULT_STAFF_IMAGE,
    status: 'active', aadharNumber: '', aadharImage: null,
    passbookImage: null, agreementImage: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [positionOptions, setPositionOptions] = useState<PositionOption[]>(contextPositionOptions);
  const [showAddPositionForm, setShowAddPositionForm] = useState(false);
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionError, setNewPositionError] = useState<string | null>(null);

  const [viewingDocument, setViewingDocument] = useState<{src: string | null, title: string}>({ src: null, title: '' });

  // ... (useEffect for fetching data and other handlers remain the same) ...
  useEffect(() => {
    setPositionOptions(contextPositionOptions);
  }, [contextPositionOptions]);

  useEffect(() => {
    const fetchStaffData = async () => {
      if (staffId) {
        setIsLoadingData(true);
        try {
          const response = await fetch(`/api/staff?id=${staffId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch staff data: ${response.statusText}`);
          }
          const result = await response.json();
          if (result.success && result.data) {
            const fetchedStaffData = result.data as StaffMember;
            setFormData({
              staffIdNumber: fetchedStaffData.staffIdNumber || '',
              name: fetchedStaffData.name,
              email: fetchedStaffData.email,
              phone: fetchedStaffData.phone,
              position: fetchedStaffData.position,
              joinDate: fetchedStaffData.joinDate ? format(new Date(fetchedStaffData.joinDate), 'yyyy-MM-dd') : '',
              salary: String(fetchedStaffData.salary),
              address: fetchedStaffData.address || '',
              image: fetchedStaffData.image || DEFAULT_STAFF_IMAGE,
              status: fetchedStaffData.status,
              aadharNumber: fetchedStaffData.aadharNumber || '',
              aadharImage: fetchedStaffData.aadharImage || null,
              passbookImage: fetchedStaffData.passbookImage || null,
              agreementImage: fetchedStaffData.agreementImage || null,
            });

            if (fetchedStaffData.position && !contextPositionOptions.some(p => p.value.toLowerCase() === fetchedStaffData.position.toLowerCase())) {
                const staffPositionOption = { value: fetchedStaffData.position, label: fetchedStaffData.position };
                addPositionOption(staffPositionOption);
            }
          } else {
            throw new Error(result.error || 'Staff member not found.');
          }
        } catch (err: any) {
          console.error(`Error fetching staff ${staffId}:`, err);
          toast.error(err.message);
        } finally {
          setIsLoadingData(false);
        }
      } else {
        toast.error("Staff ID is missing. Cannot load data.");
        setIsLoadingData(false);
      }
    };

    fetchStaffData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, addPositionOption]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prevFormData => ({ ...prevFormData, [name]: value, }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { toast.error("Image size should not exceed 2MB."); e.target.value = ''; return; }
          const reader = new FileReader();
          reader.onloadend = () => { setFormData((prev) => ({ ...prev, image: reader.result as string })); };
          reader.readAsDataURL(file);
      }
  };

  const handleAddNewPosition = () => {
      setNewPositionError(null);
      if (!newPositionName.trim()) { setNewPositionError("Position name cannot be empty."); return; }
      const formattedNewPosition = newPositionName.trim();
      if (positionOptions.some(option => option.value.toLowerCase() === formattedNewPosition.toLowerCase())) { setNewPositionError("This position already exists."); return; }
      const newOption = { value: formattedNewPosition, label: formattedNewPosition };
      addPositionOption(newOption);
      setFormData(prevData => ({ ...prevData, position: newOption.value }));
      setNewPositionName("");
      setShowAddPositionForm(false);
  };

  const handleFileChange = (fieldName: keyof EditStaffFormData, fileData: string | null) => {
    setFormData(prev => ({...prev, [fieldName]: fileData}));
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!staffId) { toast.error("Cannot save, Staff ID is missing."); setIsSubmitting(false); return; }

    // --- MODIFICATION: Updated required fields validation ---
    // Aadhar Number is now required, and Email is optional.
    if (!formData.staffIdNumber.trim() || !formData.name.trim() || !formData.phone.trim() || !formData.position.trim() || !formData.joinDate.trim() || !formData.salary.trim() || !formData.aadharNumber.trim()) {
        toast.warn("Please fill in all required fields marked with *.");
        setIsSubmitting(false);
        return;
    }
    const salaryValue = parseFloat(formData.salary);
    if (isNaN(salaryValue) || salaryValue < 0) {
        toast.error("Salary must be a valid non-negative number.");
        setIsSubmitting(false);
        return;
    }
    // --- MODIFICATION: Updated Aadhar validation ---
    // Since it's required, we directly validate its format.
     if (!/^\d{12}$/.test(formData.aadharNumber.trim())) {
        toast.error("Aadhar Number must be 12 digits.");
        setIsSubmitting(false);
        return;
    }
    
    const apiData: UpdateStaffPayload = {
        staffIdNumber: formData.staffIdNumber,
        name: formData.name,
        // --- MODIFICATION: Make email optional in payload --- 
        email: formData.email || undefined, 
        phone: formData.phone,
        position: formData.position, 
        joinDate: formData.joinDate,
        salary: salaryValue, 
        address: formData.address || undefined,
        image: formData.image === DEFAULT_STAFF_IMAGE ? null : formData.image,
        status: formData.status, 
        // --- MODIFICATION: Aadhar is now required ---
        aadharNumber: formData.aadharNumber,
        aadharImage: formData.aadharImage,
        passbookImage: formData.passbookImage,
        agreementImage: formData.agreementImage,
    };

    try {
      await updateStaffMember(staffId, apiData);
      toast.success('Staff Edited Successfully!');
      router.push('/staffmanagement/staff/stafflist');
    } catch (apiError: any) {
      console.error('Failed to update staff member:', apiError);
      toast.error(apiError.message || 'Failed to update staff. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) return <div className="p-6 text-center">Loading staff data...</div>;
  
  if (!formData.name && !isLoadingData) {
      return (
          <div className="p-6 text-center">
              <p className="text-gray-600">Could not load staff data. Please check the Staff ID and try again.</p>
              <Button variant="black" onClick={() => router.push('/staffmanagement/staff/stafflist')} className="mt-4">
                  Back to Staff List
              </Button>
          </div>
      );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* ... (The rest of the JSX is unchanged) ... */}
      <DocumentViewerModal
        src={viewingDocument.src}
        title={viewingDocument.title}
        onClose={() => setViewingDocument({ src: null, title: '' })}
      />

      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
              <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.back()} className="mr-4" disabled={isSubmitting}>Back</Button>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Edit Staff Member</h1>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="md:col-span-2 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
            <div className="flex items-center">
              <div className="flex-shrink-0 h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100">
                <img
                  src={formData.image || DEFAULT_STAFF_IMAGE}
                  alt="Staff"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="ml-5">
                 <input
                  type="file"
                  id="image-upload-input-edit"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  icon={<Upload size={16} />}
                  onClick={() => document.getElementById('image-upload-input-edit')?.click()}
                  disabled={isSubmitting}
                >
                  Change Photo
                </Button>
                 <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormData(prev => ({ ...prev, image: DEFAULT_STAFF_IMAGE }))}
                    disabled={isSubmitting || formData.image === DEFAULT_STAFF_IMAGE}
                    className="ml-2 text-xs text-gray-500 hover:text-red-500 p-1"
                    title="Reset to Default Photo"
                  >
                    Reset
                  </Button>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, WEBP up to 2MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="staffIdNumber" className="block text-sm font-medium text-gray-700 mb-1">Staff ID*</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Badge className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="staffIdNumber" name="staffIdNumber" type="text" required value={formData.staffIdNumber} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>

          {/* --- MODIFICATION: Email is now optional --- */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
             <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number*</label>
             <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>
           
           {/* --- MODIFICATION: Aadhar Number is now mandatory --- */}
           <div>
            <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number*</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Fingerprint className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="aadharNumber" name="aadharNumber" type="text" pattern="\d{12}" title="Aadhar number must be 12 digits" maxLength={12} value={formData.aadharNumber} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} required />
            </div>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position*</label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-grow">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Briefcase className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <select
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100"
                  disabled={isSubmitting || showAddPositionForm || isLoadingData}
                >
                  {positionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {!showAddPositionForm && (
                <Button
                  type="button"
                  variant="ghost"
                  icon={<PlusCircle size={20} />}
                  onClick={() => setShowAddPositionForm(true)}
                  disabled={isSubmitting || isLoadingData}
                  title="Add New Position"
                  className="p-2 text-gray-600 hover:text-black"
                />
              )}
            </div>
            {showAddPositionForm && (
              <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                <label htmlFor="newPositionNameEdit" className="block text-xs font-medium text-gray-600 mb-1">New Position Name:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    id="newPositionNameEdit"
                    value={newPositionName}
                    onChange={(e) => {
                        setNewPositionName(e.target.value);
                        if(newPositionError) setNewPositionError(null);
                    }}
                    placeholder="Enter position name"
                    className="flex-grow w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    disabled={isSubmitting || isLoadingData}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddNewPosition}
                    disabled={isSubmitting || !newPositionName.trim() || isLoadingData}
                  >Add</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                        setShowAddPositionForm(false);
                        setNewPositionName("");
                        setNewPositionError(null);
                    }}
                    disabled={isSubmitting || isLoadingData}
                    className="p-1.5 text-gray-500 hover:text-red-600"
                    icon={<XCircle size={18} />}
                    title="Cancel Adding Position"
                  />
                </div>
                {newPositionError && <p className="text-xs text-red-600 mt-1">{newPositionError}</p>}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 mb-1">Join Date*</label>
             <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="joinDate" name="joinDate" type="date" required value={formData.joinDate} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>
          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)*</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IndianRupee className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input id="salary" name="salary" type="number" required min="0" step="any" value={formData.salary} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <div className="relative">
                <div className="pointer-events-none absolute top-3 left-0 flex items-center pl-3">
                    <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <textarea id="address" name="address" rows={3} value={formData.address} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData}></textarea>
            </div>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
             <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Activity className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
              <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || isLoadingData}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
           <div className="md:col-span-2 border-t pt-5 mt-3 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploadInput 
                    id="aadhar-upload-edit"
                    label="Aadhar Card"
                    icon={<ShieldCheck size={16} className="text-gray-500"/>}
                    fileData={formData.aadharImage}
                    onFileChange={(data) => handleFileChange('aadharImage', data)}
                    onView={() => setViewingDocument({ src: formData.aadharImage, title: "Aadhar Card" })}
                    isSubmitting={isSubmitting || isLoadingData}
                />
                 <FileUploadInput 
                    id="passbook-upload-edit"
                    label="Bank Passbook"
                    icon={<Banknote size={16} className="text-gray-500"/>}
                    fileData={formData.passbookImage}
                    onFileChange={(data) => handleFileChange('passbookImage', data)}
                    onView={() => setViewingDocument({ src: formData.passbookImage, title: "Bank Passbook" })}
                    isSubmitting={isSubmitting || isLoadingData}
                />
                 <FileUploadInput 
                    id="agreement-upload-edit"
                    label="Agreement"
                    icon={<FileText size={16} className="text-gray-500"/>}
                    fileData={formData.agreementImage}
                    onFileChange={(data) => handleFileChange('agreementImage', data)}
                    onView={() => setViewingDocument({ src: formData.agreementImage, title: "Agreement" })}
                    isSubmitting={isSubmitting || isLoadingData}
                />
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline-danger"
            onClick={() => router.back()}
            disabled={isSubmitting || isLoadingData}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="black"
            icon={<Save size={16} />}
            disabled={isSubmitting || isLoadingData}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};


const EditStaffPage: React.FC = () => {
    return (
      <Suspense fallback={<div className="p-6 text-center">Loading editor...</div>}>
        <EditStaffContent />
      </Suspense>
    );
  };
  
  export default EditStaffPage;