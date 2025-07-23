"use client";

import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Upload, PlusCircle, XCircle, Eye, Trash2, FileText, Banknote, ShieldCheck,
  User, Mail, Phone, Fingerprint, Briefcase, Calendar, IndianRupee, MapPin, Image as ImageIcon,
  Badge
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useStaff, NewStaffPayload, PositionOption } from '../../../../../context/StaffContext';
import Button from '../../../../../components/ui/Button';

interface StaffFormData {
  staffIdNumber: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  joinDate: string;
  salary: number | '';
  address: string;
  image: string | null;
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
            <p className="text-xs text-gray-500">Max 5MB (PNG, JPG, PDF)</p>
          </>
        )}
      </div>
    </div>
  );
};


const AddStaffPage: React.FC = () => {
  const router = useRouter();
  const {
    addStaffMember,
    positionOptions: contextPositionOptions = [],
    addPositionOption
  } = useStaff();
  
  const [formData, setFormData] = useState<StaffFormData>({
    staffIdNumber: 'Loading...',
    name: '',
    email: '',
    phone: '',
    position: '', 
    joinDate: new Date().toISOString().split('T')[0],
    salary: '',
    address: '',
    image: DEFAULT_STAFF_IMAGE,
    aadharNumber: '',
    aadharImage: null,
    passbookImage: null,
    agreementImage: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [positionOptions, setPositionOptions] = useState<PositionOption[]>(contextPositionOptions);
  const [showAddPositionForm, setShowAddPositionForm] = useState(false);
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionError, setNewPositionError] = useState<string | null>(null);
  
  const [viewingDocument, setViewingDocument] = useState<{src: string | null, title: string}>({ src: null, title: '' });


  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const response = await fetch('/api/staff?action=getNextId');
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch Staff ID from server.');
        }
        const result = await response.json();
        if (result.success) {
          setFormData(prev => ({ ...prev, staffIdNumber: result.data.nextId }));
        } else {
          throw new Error(result.error || 'Could not retrieve next Staff ID.');
        }
      } catch (err: any) {
        setFormData(prev => ({ ...prev, staffIdNumber: 'Error' }));
        toast.error(`Could not load Staff ID: ${err.message}`);
        console.error(err);
      }
    };
    fetchNextId();
  }, []); 

  useEffect(() => {
    setPositionOptions(contextPositionOptions);
    if (!formData.position && contextPositionOptions.length > 0) {
        const firstSelectableOption = contextPositionOptions.find(opt => opt.value !== "")?.value || contextPositionOptions[0]?.value;
        if (firstSelectableOption) {
             setFormData(prev => ({ ...prev, position: firstSelectableOption }));
        }
    }
  }, [contextPositionOptions, formData.position]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  
  const handleFileChange = (fieldName: keyof StaffFormData, fileData: string | null) => {
    setFormData(prev => ({...prev, [fieldName]: fileData}));
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          toast.error("Image size should not exceed 2MB.");
          e.target.value = '';
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewPosition = () => { 
      setNewPositionError(null);
      if (!newPositionName.trim()) {
        setNewPositionError("Position name cannot be empty.");
        return;
      }
      const formattedNewPosition = newPositionName.trim();
      if (positionOptions.some(option => option.value.toLowerCase() === formattedNewPosition.toLowerCase())) {
        setNewPositionError("This position already exists.");
        return;
      }
  
      const newOption = { value: formattedNewPosition, label: formattedNewPosition };
      addPositionOption(newOption);
      setFormData(prevData => ({ ...prevData, position: newOption.value }));
      setNewPositionName("");
      setShowAddPositionForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (formData.staffIdNumber === 'Loading...' || formData.staffIdNumber === 'Error') {
      toast.error("Staff ID is not available. Please wait or refresh the page.");
      setIsSubmitting(false);
      return;
    }
    
    if (!formData.name.trim() || !formData.phone.trim() || !formData.position.trim() || !formData.aadharNumber.trim()) {
        toast.warn("Please fill in all required fields marked with * (Name, Phone, Aadhar Number, Position).");
        setIsSubmitting(false);
        return;
    }
    if (!/^\d{12}$/.test(formData.aadharNumber.trim())) {
        toast.error("Aadhar Number must be exactly 12 digits.");
        setIsSubmitting(false);
        return;
    }
    if (formData.salary !== '' && Number(formData.salary) < 0) {
        toast.error("Salary cannot be negative.");
        setIsSubmitting(false);
        return;
    }

    const apiData: NewStaffPayload = {
        staffIdNumber: formData.staffIdNumber,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        position: formData.position,
        joinDate: formData.joinDate,
        salary: Number(formData.salary) || 0,
        address: formData.address || undefined,
        image: formData.image === DEFAULT_STAFF_IMAGE ? null : formData.image,
        aadharNumber: formData.aadharNumber,
        aadharImage: formData.aadharImage,
        passbookImage: formData.passbookImage,
        agreementImage: formData.agreementImage,
    };

    try {
      await addStaffMember(apiData);
      router.push('/staffmanagement/staff/stafflist?success=add');
    } catch (apiError: any) {
      console.error('Failed to add staff member:', apiError);
      toast.error(apiError.message || 'Failed to add staff member. Please try again.');
      setIsSubmitting(false);
    }
  };

  const IconLabel: React.FC<{ htmlFor: string; icon: React.ReactNode; text: string; }> = ({ htmlFor, icon, text }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      <div className="flex items-center gap-2">
        {icon}
        <span>{text}</span>
      </div>
    </label>
  );

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
      
      <DocumentViewerModal
        src={viewingDocument.src}
        title={viewingDocument.title}
        onClose={() => setViewingDocument({ src: null, title: '' })}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.back()} className="mr-4" disabled={isSubmitting}>Back</Button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Add New Staff Member</h1>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="md:col-span-2 mb-4">
            <IconLabel htmlFor="image-upload-input" icon={<ImageIcon size={14} className="text-gray-500" />} text="Profile Photo" />
            <div className="flex items-center mt-1">
                <div className="flex-shrink-0 h-24 w-24 overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100">
                    <img src={formData.image || DEFAULT_STAFF_IMAGE} alt="Staff Preview" className="h-full w-full object-cover"/>
                </div>
                <div className="ml-5">
                    <input type="file" id="image-upload-input" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} className="hidden" disabled={isSubmitting}/>
                    <Button type="button" variant="outline" icon={<Upload size={16} />} onClick={() => document.getElementById('image-upload-input')?.click()} disabled={isSubmitting}>Upload Photo</Button>
                    <Button type="button" variant="ghost" onClick={() => setFormData(prev => ({ ...prev, image: DEFAULT_STAFF_IMAGE }))} disabled={isSubmitting || formData.image === DEFAULT_STAFF_IMAGE} className="ml-2 text-xs text-gray-500 hover:text-red-500 p-1" title="Reset to Default Photo">Reset</Button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to 2MB.</p>
                </div>
            </div>
          </div>
          
          <div>
            <IconLabel htmlFor="staffIdNumber" icon={<Badge size={14} className="text-gray-500" />} text="Staff ID*" />
            <input id="staffIdNumber" name="staffIdNumber" type="text" required value={formData.staffIdNumber} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-gray-100 cursor-not-allowed" readOnly />
          </div>
          <div>
            <IconLabel htmlFor="name" icon={<User size={14} className="text-gray-500" />} text="Full Name*" />
            <input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div>
            <IconLabel htmlFor="email" icon={<Mail size={14} className="text-gray-500" />} text="Email Address" />
            <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div>
            <IconLabel htmlFor="phone" icon={<Phone size={14} className="text-gray-500" />} text="Phone Number*" />
            <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div>
            <IconLabel htmlFor="aadharNumber" icon={<Fingerprint size={14} className="text-gray-500" />} text="Aadhar Number*" />
            <input id="aadharNumber" name="aadharNumber" type="text" required pattern="\d{12}" title="Aadhar number must be 12 digits" maxLength={12} value={formData.aadharNumber} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div>
            <IconLabel htmlFor="position" icon={<Briefcase size={14} className="text-gray-500" />} text="Position*" />
            <div className="flex items-center space-x-2">
              <select id="position" name="position" required value={formData.position} onChange={handleInputChange} className="flex-grow w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting || showAddPositionForm}>
                {positionOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
              {!showAddPositionForm && (<Button type="button" variant="ghost" icon={<PlusCircle size={20} />} onClick={() => setShowAddPositionForm(true)} disabled={isSubmitting} title="Add New Position" className="p-2 text-gray-600 hover:text-black"/>)}
            </div>
            {showAddPositionForm && (
              <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <label htmlFor="newPositionName" className="block text-xs font-medium text-gray-600 mb-1">New Position Name:</label>
                  <div className="flex items-center space-x-2">
                    <input type="text" id="newPositionName" value={newPositionName} onChange={(e) => { setNewPositionName(e.target.value); if(newPositionError) setNewPositionError(null);}} placeholder="Enter position name" className="flex-grow w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black" disabled={isSubmitting}/>
                    <Button type="button" variant="primary" size="sm" onClick={handleAddNewPosition} disabled={isSubmitting || !newPositionName.trim()}>Add</Button>
                    <Button type="button" variant="ghost" onClick={() => { setShowAddPositionForm(false); setNewPositionName(""); setNewPositionError(null);}} disabled={isSubmitting} className="p-1.5 text-gray-500 hover:text-red-600" icon={<XCircle size={18} />} title="Cancel Adding Position"/>
                  </div>
                  {newPositionError && <p className="text-xs text-red-600 mt-1">{newPositionError}</p>}
              </div>
            )}
          </div>
          <div>
            <IconLabel htmlFor="joinDate" icon={<Calendar size={14} className="text-gray-500" />} text="Join Date*" />
            <input id="joinDate" name="joinDate" type="date" required value={formData.joinDate} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div>
            <IconLabel htmlFor="salary" icon={<IndianRupee size={14} className="text-gray-500" />} text="Monthly Salary*" />
            <input id="salary" name="salary" type="number" required min="0" step="any" value={formData.salary} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}/>
          </div>
          <div className="md:col-span-2">
            <IconLabel htmlFor="address" icon={<MapPin size={14} className="text-gray-500" />} text="Address" />
            <textarea id="address" name="address" rows={3} value={formData.address} onChange={handleInputChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100" disabled={isSubmitting}></textarea>
          </div>

          <div className="md:col-span-2 border-t pt-5 mt-3 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploadInput 
                    id="aadhar-upload"
                    label="Aadhar Card"
                    icon={<ShieldCheck size={16} className="text-gray-500"/>}
                    fileData={formData.aadharImage}
                    onFileChange={(data) => handleFileChange('aadharImage', data)}
                    onView={() => setViewingDocument({ src: formData.aadharImage, title: "Aadhar Card" })}
                    isSubmitting={isSubmitting}
                />
                 <FileUploadInput 
                    id="passbook-upload"
                    label="Bank Passbook"
                    icon={<Banknote size={16} className="text-gray-500"/>}
                    fileData={formData.passbookImage}
                    onFileChange={(data) => handleFileChange('passbookImage', data)}
                    onView={() => setViewingDocument({ src: formData.passbookImage, title: "Bank Passbook" })}
                    isSubmitting={isSubmitting}
                />
                 <FileUploadInput 
                    id="agreement-upload"
                    label="Agreement"
                    icon={<FileText size={16} className="text-gray-500"/>}
                    fileData={formData.agreementImage}
                    onFileChange={(data) => handleFileChange('agreementImage', data)}
                    onView={() => setViewingDocument({ src: formData.agreementImage, title: "Agreement" })}
                    isSubmitting={isSubmitting}
                />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="black" icon={<Save size={16} />} disabled={isSubmitting} isLoading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Staff Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddStaffPage;