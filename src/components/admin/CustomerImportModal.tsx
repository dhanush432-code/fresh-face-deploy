// /src/components/admin/CustomerImportModal.tsx

"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';
import { XIcon, UploadCloudIcon, FileTextIcon } from 'lucide-react';
import { toast } from 'react-toastify';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (report: any) => void;
}

const REQUIRED_HEADERS = ['Name', 'PhoneNumber'];

export default function CustomerImportModal({ isOpen, onClose, onImportSuccess }: CustomerImportModalProps) {
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
      'text/csv': ['.csv'],
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
      const arrayBuffer = await file.arrayBuffer();
      const workbook: WorkBook = read(arrayBuffer);
      const worksheetName = workbook.SheetNames[0];
      const worksheet: WorkSheet = workbook.Sheets[worksheetName];
      const data: any[] = utils.sheet_to_json(worksheet);

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          throw new Error(`The file is missing required columns: ${missingHeaders.join(', ')}`);
        }
      }

      const response = await fetch('/api/customer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Import failed.");
      
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
          <h2 className="text-xl font-semibold text-gray-900">Import Customers from File</h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the template to ensure your column headers are correct.</li>
              <li>Fill the sheet with your customer data. Do not change the header names.</li>
              <li>The <strong>PhoneNumber</strong> column must be unique for each customer. Existing phone numbers will be updated.</li>
              <li>To import members, set <strong>IsMembership</strong> to `TRUE` and provide a unique <strong>MembershipBarcode</strong>.</li>
              <li>Optional columns are: `Email`, `Gender`, `DOB` (use YYYY-MM-DD format), and `Survey`.</li>
            </ol>
            <a href="/templates/customer_import_template.xlsx" download
               className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline">
              Download CSV Template
            </a>
          </div>

          <div {...getRootProps()}
               className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
               ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center">
              <UploadCloudIcon className="h-12 w-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">
                {isDragActive ? "Drop the file here..." : "Drag & drop an Excel or CSV file here"}
              </p>
              <p className="text-xs text-gray-500 mt-1">.XLSX, .XLS, or .CSV files only</p>
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
              <button onClick={() => setFile(null)} disabled={isProcessing}
                      className="p-1 text-gray-500 hover:text-red-600 rounded-full">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button onClick={onClose} disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-medium bg-white border rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleImport} disabled={!file || isProcessing}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 shadow-sm flex items-center gap-2">
            {isProcessing ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
