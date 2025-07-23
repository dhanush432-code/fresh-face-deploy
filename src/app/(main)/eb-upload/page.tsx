'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { 
  ArrowUpTrayIcon, 
  XMarkIcon as XMarkOutlineIcon,
  DocumentIcon,
  CalendarDaysIcon,
  PhotoIcon,
  XCircleIcon,
  CheckCircleIcon,
  XMarkIcon as XMarkSolidIcon // Renamed for clarity
} from '@heroicons/react/24/solid';
import Image from 'next/image';

// --- Utility & Reusable Components (Keep these in separate files in a real app) ---

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const ImageZoomModal = ({ src, onClose }: { src: string; onClose: () => void; }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 transition-opacity duration-300" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2" onClick={onClose} aria-label="Close image zoom view">
        <XMarkOutlineIcon className="h-8 w-8" />
      </button>
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] transition-transform duration-300 scale-95 animate-zoom-in" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt="Zoomed meter image" layout="fill" className="object-contain rounded-lg" />
      </div>
    </div>
  );
};

const NotificationToast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void; }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  return (
    <div className="fixed top-5 right-5 z-[60] w-full max-w-sm animate-fade-in-down">
      <div className={`rounded-lg ${isSuccess ? 'bg-green-50' : 'bg-red-50'} p-4 shadow-lg ring-1 ring-black ring-opacity-5`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {isSuccess ? <CheckCircleIcon className="h-5 w-5 text-green-400" /> : <XCircleIcon className="h-5 w-5 text-red-400" />}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>{message}</p>
          </div>
          <div className="ml-auto pl-3">
            <button type="button" onClick={onClose} className={`inline-flex rounded-md p-1.5 ${isSuccess ? 'text-green-500 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'}`}>
              <span className="sr-only">Dismiss</span><XMarkSolidIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageDropzone = ({ file, onFileSelect, onClear, onZoom, disabled = false }: { file: File | null; onFileSelect: (file: File) => void; onClear: () => void; onZoom: () => void; disabled?: boolean; }) => {
  const [isDragging, setIsDragging] = useState(false);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  }, []);
  const handleDragOut = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [disabled, onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && e.target.files && e.target.files[0]) onFileSelect(e.target.files[0]);
  };

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  return (
    <div className="flex flex-col h-full">
      <label
        htmlFor="file-upload"
        className={`relative flex flex-col items-center justify-center w-full h-full rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-300
        ${disabled ? 'bg-slate-200/50 cursor-not-allowed' : 'bg-slate-100 hover:border-indigo-400'}
        ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}
        onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop}
      >
        {!file || !preview ? (
          <div className="space-y-2">
            <PhotoIcon className="mx-auto h-16 w-16 text-slate-400" />
            <p className="font-semibold text-slate-700">
              <span className="text-indigo-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500">PNG, JPG, or GIF (max 10MB)</p>
          </div>
        ) : (
          <div className="relative w-full text-left">
            <div className="overflow-hidden rounded-xl shadow-lg bg-white cursor-zoom-in" onClick={!disabled ? (e) => { e.preventDefault(); e.stopPropagation(); onZoom(); } : undefined}>
                <Image src={preview} alt="Meter image preview" width={500} height={400} className="w-full h-64 object-cover" />
                <div className="p-4 border-t border-slate-200">
                  <div className="flex items-start">
                    <DocumentIcon className="h-10 w-10 text-slate-400 flex-shrink-0 mr-3 mt-1"/>
                    <div>
                        <p className="text-sm font-medium text-slate-800 break-all">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                </div>
            </div>
             <button
              type="button"
              onClick={!disabled ? (e) => { e.preventDefault(); e.stopPropagation(); onClear(); } : undefined}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 text-slate-500 hover:text-red-600 shadow-md transition-transform duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Remove image"
              disabled={disabled}
            >
              <XCircleIcon className="h-8 w-8" />
            </button>
          </div>
        )}
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={disabled} />
      </label>
    </div>
  );
};


// --- Main EB Upload Page Component ---
export default function EBUploadPage() {
  const { data: session } = useSession();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error'; }>({ show: false, message: '', type: 'success' });

  const canUploadEB = session && hasPermission(session.user.role.permissions, PERMISSIONS.EB_UPLOAD);

  const handleClearForm = () => {
    setImageFile(null);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !date) {
      setNotification({ show: true, message: 'Please select a date and an image file.', type: 'error' });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('date', date);

    try {
      const response = await fetch('/api/eb', { method: 'POST', body: formData });
      if (response.ok) {
        setNotification({ show: true, message: `Morning reading uploaded successfully!`, type: 'success' });
        handleClearForm();
      } else {
        const errorData = await response.json();
        setNotification({ show: true, message: errorData.message || 'An unknown error occurred.', type: 'error' });
      }
    } catch (error) {
      console.error('Error uploading EB reading:', error);
      setNotification({ show: true, message: 'Failed to upload reading. Please check your connection.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!canUploadEB) {
    return (
      <div className="p-6 bg-slate-100 min-h-screen">
        <p className="text-red-600">You do not have permission to upload EB readings.</p>
      </div>
    );
  }

  return (
    <>
      {isZoomed && imageFile && (
        <ImageZoomModal src={URL.createObjectURL(imageFile)} onClose={() => setIsZoomed(false)} />
      )}
      
      {notification.show && (
        <NotificationToast 
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <main className="bg-slate-100 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Upload Morning Reading</h1>
                <p className="text-slate-500 mt-1">Upload the meter image for the morning of the selected date.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80">
                <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-5">
                    {/* Left side: Form Fields */}
                    <div className="px-6 py-8 sm:p-10 lg:col-span-2">
                        <h2 className="text-xl font-semibold text-slate-800">Reading Details</h2>
                        <p className="text-sm text-slate-500 mt-1">Select the date for this reading.</p>
                        <div className="mt-8 space-y-8">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date of Morning Reading</label>
                                <div className="relative mt-2">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10 p-2.5 disabled:cursor-not-allowed disabled:bg-slate-50"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                         <div className="mt-12 pt-8 border-t border-slate-200">
                            <button
                                type="submit"
                                disabled={isLoading || !imageFile}
                                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-indigo-400 transition-all"
                            >
                                <ArrowUpTrayIcon className={`-ml-1 mr-3 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Uploading...' : 'Upload Image'}
                            </button>
                        </div>
                    </div>

                    {/* Right side: Dropzone */}
                    <div className="lg:col-span-3 p-6 sm:p-10 bg-slate-50/70 lg:border-l lg:border-slate-200">
                        <ImageDropzone 
                            file={imageFile}
                            onFileSelect={(file) => setImageFile(file)}
                            onClear={() => setImageFile(null)}
                            onZoom={() => setIsZoomed(true)}
                            disabled={isLoading}
                        />
                    </div>
                </form>
            </div>
        </div>
      </main>
    </>
  );
}