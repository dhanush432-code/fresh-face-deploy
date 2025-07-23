// src/app/(main)/inventory-checker/page.tsx
'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import { Chart } from 'chart.js/auto';
import { Toaster, toast } from 'react-hot-toast';
import { Package, Warehouse, History, X, Search, AlertTriangle, Building, Tag, FileDown } from 'lucide-react';

// --- Interface Definitions (Unchanged) ---
interface PopulatedRef { _id: string; name: string; }
interface Product { _id: string; sku: string; name: string; brand: PopulatedRef; subCategory: PopulatedRef; type: 'Retail' | 'In-House'; totalQuantity: number; numberOfItems: number; quantityPerItem: number; unit: 'ml' | 'g' | 'kg' | 'l' | 'piece'; }
interface InventoryCheck { _id: string; product: Product; date: string; expectedQuantity: number; actualQuantity: number; discrepancy: number; notes?: string; checkedBy: { name: string }; }

// --- Helper Component: StockDisplay (Unchanged) ---
const StockDisplay = ({ product }: { product: Product }) => {
  const { numberOfItems, quantityPerItem, unit } = product;
  if (unit === 'piece') { return (<div className="text-right"><p className="text-xl font-bold text-gray-800">{numberOfItems}<span className="text-base font-normal text-gray-500"> {unit}{numberOfItems !== 1 ? 's' : ''}</span></p></div>); }
  return (<div className="text-right"><p className="text-xl font-bold text-gray-800">{numberOfItems}<span className="text-base font-normal text-gray-500"> items</span></p><p className="text-xs text-gray-600">({quantityPerItem}{unit} each)</p></div>);
};

// --- Child Component: HistoryModal (Unchanged) ---
const HistoryModal = ({ onClose, history, productName }: { onClose: () => void; history: InventoryCheck[]; productName: string; }) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => { const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc); }, [onClose]);
  useEffect(() => {
    if (history.length > 0 && chartCanvasRef.current) {
      const ctx = chartCanvasRef.current.getContext('2d');
      if (!ctx) return;
      if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); }
      chartInstanceRef.current = new Chart(ctx, { type: 'line', data: { labels: history.map(item => new Date(item.date).toLocaleDateString()).reverse(), datasets: [ { label: 'Expected', data: history.map(item => item.expectedQuantity).reverse(), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3 }, { label: 'Actual', data: history.map(item => item.actualQuantity).reverse(), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 }, ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { beginAtZero: true } } } });
    }
    return () => { if (chartInstanceRef.current) { chartInstanceRef.current.destroy(); chartInstanceRef.current = null; } };
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in-fast">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4 animate-slide-up-fast">
        <div className="flex items-center justify-between p-4 border-b"><h2 className="text-xl font-semibold text-gray-800">Inventory History: {productName}</h2><button onClick={onClose} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"><X className="h-6 w-6" /></button></div>
        <div className="p-6 space-y-8 overflow-y-auto">
          <div className="h-80 border border-gray-200 rounded-lg p-4"><canvas ref={chartCanvasRef}></canvas></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected (Total)</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual (Total)</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancy</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked By</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th></tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(check => (<tr key={check._id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(check.date).toLocaleDateString()}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{check.expectedQuantity.toFixed(2)} {check.product.unit}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{check.actualQuantity.toFixed(2)} {check.product.unit}</td><td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${check.discrepancy === 0 ? 'bg-gray-100 text-gray-800' : check.discrepancy < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{check.discrepancy.toFixed(2)}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{check.checkedBy?.name || 'N/A'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{check.notes || '-'}</td></tr>))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component: InventoryCheckerPage ---
export default function InventoryCheckerPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [actualNumberOfItems, setActualNumberOfItems] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<InventoryCheck[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyModalProduct, setHistoryModalProduct] = useState<Product | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canCheckInventory = session && hasPermission(session.user.role.permissions, 'inventory-checker:create');
  const canReadInventory = session && hasPermission(session.user.role.permissions, 'inventory-checker:read');
  
  useEffect(() => {
    const fetchProducts = async () => {
      setIsProductsLoading(true);
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        if (data.success) { setProducts(data.data); } 
        else { toast.error(data.message || "Failed to load products."); }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error("An error occurred while fetching products.");
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleToggleCheckForm = (productId: string) => {
    setExpandedProductId(prevId => (prevId === productId ? null : productId));
    setActualNumberOfItems('');
    setNotes('');
  };

  const handleViewHistory = async (product: Product) => {
    setHistoryModalProduct(product);
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`/api/inventory-check?productId=${product._id}`);
      const data = await res.json();
      if (data.success) { setHistory(data.history); } 
      else { toast.error(data.message || 'Failed to fetch history.'); }
    } catch (error) {
      toast.error('Failed to fetch history.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

   // --- NEW: Function to handle the export ---
  const handleExport = async () => {
    setIsExporting(true);
    toast.loading('Generating your report...', { id: 'export-toast' });
    try {
      const response = await fetch('/api/inventory-check/export');
      if (!response.ok) {
        throw new Error('Failed to generate report. Please try again.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'InventoryCheckReport.xlsx';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report downloaded successfully!', { id: 'export-toast' });
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred.', { id: 'export-toast' });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p._id === expandedProductId);
    if (!product || actualNumberOfItems === '') return;
    
    const actualCount = parseInt(actualNumberOfItems, 10);
    if (isNaN(actualCount)) { toast.error("Please enter a valid number."); return; }
    
    const hasDiscrepancy = product.numberOfItems !== actualCount;
    if (hasDiscrepancy && !notes.trim()) {
        toast.error("Notes are required when there is a discrepancy.");
        return;
    }

    setIsSubmitting(true);
    try {
      const newTotalQuantity = actualCount * product.quantityPerItem;
      const response = await fetch('/api/inventory-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: expandedProductId, actualQuantity: newTotalQuantity, notes }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to submit check.');
      toast.success('Inventory check submitted successfully!');
      setProducts(prevProducts => prevProducts.map(p => 
          p._id === expandedProductId 
            ? { ...p, totalQuantity: newTotalQuantity, numberOfItems: actualCount } 
            : p
      ));
      setExpandedProductId(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.brand && product.brand.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.subCategory && product.subCategory.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const retailProducts = filteredProducts.filter(p => p.type === 'Retail');
  const inHouseProducts = filteredProducts.filter(p => p.type === 'In-House');

  if (!canReadInventory) {
     return (
        <div className="flex items-center justify-center h-full p-6 text-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-gray-800">Access Denied</h2>
            <p className="mt-2 text-gray-600">You do not have permission to access the inventory checker.</p>
          </div>
        </div>
     );
  }

  const renderProductTable = (title: string, icon: React.ReactNode, productList: Product[]) => {
    // --- NEW: Helper function to determine if the submit button should be disabled ---
    const isSubmitDisabled = (product: Product) => {
        if (isSubmitting || !actualNumberOfItems) {
            return true;
        }
        const actualCount = parseInt(actualNumberOfItems, 10);
        if (isNaN(actualCount)) {
            return true;
        }
        const hasDiscrepancy = product.numberOfItems !== actualCount;
        if (hasDiscrepancy && !notes.trim()) {
            return true; // Disable if discrepancy exists and notes are empty
        }
        return false;
    };

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center mt-8">{icon}{title}</h2>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isProductsLoading && ( <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading products...</td></tr> )}
                {!isProductsLoading && productList.length === 0 && ( <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">{searchQuery ? `No products matching "${searchQuery}" found.` : 'No products found in this category.'}</td></tr> )}
                {!isProductsLoading && productList.map((product) => (
                  <Fragment key={product._id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-middle"><div className="font-medium text-gray-900">{product.name}</div><div className="text-gray-500">SKU: {product.sku}</div></td>
                      <td className="px-6 py-4 align-middle"><div className="text-gray-800 flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /> {product.brand?.name || 'N/A'}</div><div className="text-gray-500 flex items-center gap-2 mt-1"><Tag className="h-4 w-4 text-gray-400" /> {product.subCategory?.name || 'N/A'}</div></td>
                      <td className="px-6 py-4 align-middle"><StockDisplay product={product} /></td>
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleViewHistory(product)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-blue-600" aria-label={`View history for ${product.name}`}><History className="h-5 w-5" /></button>
                          {canCheckInventory && (<button onClick={() => handleToggleCheckForm(product._id)} className={`inline-flex items-center px-4 py-1.5 text-xs font-medium rounded-md shadow-sm text-white ${expandedProductId === product._id ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'}`}>{expandedProductId === product._id ? 'Cancel' : 'Check'}</button>)}
                        </div>
                      </td>
                    </tr>
                    {expandedProductId === product._id && (
                      <tr className="bg-blue-50/50">
                        <td colSpan={4} className="p-0">
                          <div className="p-6 animate-fade-in-fast">
                            <form onSubmit={handleSubmit} className="space-y-4 bg-white ring-1 ring-blue-200 p-4 rounded-lg shadow-inner">
                              <h3 className="font-semibold text-gray-800">New Inventory Count for {product.name}</h3>
                              <div>
                                <label htmlFor={`actualNumberOfItems-${product._id}`} className="block text-sm font-medium text-gray-700">Actual Number of Items</label>
                                <input id={`actualNumberOfItems-${product._id}`} type="number" step="1" value={actualNumberOfItems} onChange={(e) => setActualNumberOfItems(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" required autoFocus placeholder="e.g., 10" />
                              </div>
                              <div>
                                {/* --- MODIFIED: Notes UI --- */}
                                <label htmlFor={`notes-${product._id}`} className="block text-sm font-medium text-gray-700">Notes <span className="text-red-500">*</span></label>
                                <textarea id={`notes-${product._id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" placeholder="e.g., Damaged item, expired stock, etc." required={product.numberOfItems !== parseInt(actualNumberOfItems || '0', 10)}></textarea>
                                <p className="text-xs text-gray-500 mt-1">Required if there is a discrepancy between expected ({product.numberOfItems}) and actual count.</p>
                              </div>
                              {/* --- MODIFIED: Button's disabled logic --- */}
                              <button type="submit" disabled={isSubmitDisabled(product)} className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">{isSubmitting ? 'Submitting...' : 'Submit Count'}</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8">
        <Toaster position="top-right" reverseOrder={false} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory Checker</h1>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search by Name, SKU, Brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 w-full sm:w-64 border border-black rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          </div>
                      <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-gray-400"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export All'}</span>
            </button>
        </div>
        
        {renderProductTable('Retail Products', <Package className="h-7 w-7 mr-3 text-blue-600" />, retailProducts)}
        {renderProductTable('In-House Stock', <Warehouse className="h-7 w-7 mr-3 text-green-600" />, inHouseProducts)}
      </div>

        {historyModalProduct && (<HistoryModal onClose={() => setHistoryModalProduct(null)} history={history} productName={historyModalProduct.name} />)}    </>
  );
}