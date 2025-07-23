// /src/components/admin/ProductImportModal.tsx

"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';
import { XIcon, UploadCloudIcon, FileTextIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { toast } from 'react-toastify';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (report: any) => void;
}

const REQUIRED_HEADERS = [
  'BrandName', 'SubCategoryName', 'ProductName', 'SKU', 'ProductType', 'Price', 
  'NumberOfItems', 'QuantityPerItem', 'Unit', 'StockedDate'
];

export default function ProductImportModal({ isOpen, onClose, onImportSuccess }: ProductImportModalProps) {
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
      const arrayBuffer = await file.arrayBuffer();
      const workbook: WorkBook = read(arrayBuffer);
      const worksheetName = workbook.SheetNames[0];
      const worksheet: WorkSheet = workbook.Sheets[worksheetName];
      const data: any[] = utils.sheet_to_json(worksheet);

      // --- Header Validation ---
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          throw new Error(`The Excel file is missing required columns: ${missingHeaders.join(', ')}`);
        }
      }

      // --- Send to API ---
      const response = await fetch('/api/products/import', {
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
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import Products from Excel</h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the template to ensure your column headers are correct.</li>
              <li>Fill the sheet with your product data. Do not change the header names.</li>
              <li>The <strong className="font-semibold">SKU</strong> column must be unique for each product. Existing SKUs will be updated.</li>
              <li>Upload the completed file below.</li>
            </ol>
            <a href="/templates/product_import_template.xlsx" download
               className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline">
              Download Template
            </a>
          </div>

          {/* Dropzone */}
          <div {...getRootProps()}
               className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
               ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center">
              <UploadCloudIcon className="h-12 w-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">
                {isDragActive ? "Drop the file here..." : "Drag & drop an Excel file here, or click to select"}
              </p>
              <p className="text-xs text-gray-500 mt-1">.XLSX or .XLS files only</p>
            </div>
          </div>
          
          {/* File Preview */}
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
        
        {/* Footer */}
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