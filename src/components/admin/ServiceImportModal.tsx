"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { read, utils } from 'xlsx';
import { X, UploadCloudIcon, FileTextIcon } from 'lucide-react';
import { toast } from 'react-toastify';

type AudienceType = "male" | "female" | "Unisex";

interface ServiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (report: any) => void;
  audience: AudienceType;
}

const REQUIRED_HEADERS = [
  'ServiceName', 'ServiceCode', 'CategoryName', 'SubCategoryName', 'Duration', 'Price'
];

export default function ServiceImportModal({ isOpen, onClose, onImportSuccess, audience }: ServiceImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });
  
  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file to import.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) throw new Error("Excel file is empty.");
      
      const headers = Object.keys(jsonData[0]);
      const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`File is missing required columns: ${missingHeaders.join(', ')}`);
      }

      const response = await fetch(`/api/service-items/import?audience=${audience}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Import failed on the server.");
      
      onImportSuccess(result.report);
      onClose();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Services for <span className="text-indigo-600">{audience}</span></h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* --- UPDATED INSTRUCTIONS --- */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                All services in the uploaded file will be automatically assigned to the currently selected audience: <strong className="font-semibold">{audience}</strong>.
              </li>
              <li>
                The <strong>ServiceCode</strong> column must be unique for each service. It is used to update existing services if you re-upload a file.
              </li>
              <li>
                Each service and its consumables must be defined in a **single row**.
              </li>
              <li>
                To add consumables, use the `Consumable1_SKU`, `Consumable1_Default_Qty`, etc., columns.
              </li>
               <li>
                The `Consumable_SKU` must exactly match the SKU of an existing product in your inventory. The import for that specific service will fail if the SKU is not found.
              </li>
            </ol>
            <a href="/templates/service_import_template.xlsx" download
               className="inline-block mt-4 text-sm font-medium text-blue-600 hover:underline">
              Download Template
            </a>
          </div>

          <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center">
              <UploadCloudIcon className="h-12 w-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">{isDragActive ? "Drop the file here..." : "Drag & drop file or click to select"}</p>
            </div>
          </div>
          
          {file && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileTextIcon className="h-6 w-6 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} disabled={isProcessing} className="p-1 text-gray-500 hover:text-red-600 rounded-full">
                  <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button onClick={onClose} disabled={isProcessing} className="px-6 py-2.5 text-sm font-medium bg-white border rounded-lg hover:bg-gray-100">Cancel</button>
          <button onClick={handleImport} disabled={!file || isProcessing} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
            {isProcessing ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
}