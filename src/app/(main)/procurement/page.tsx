'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, PlusIcon, XMarkIcon, ShoppingBagIcon, CalendarDaysIcon, TruckIcon } from '@heroicons/react/24/outline';

interface ProcurementRecord {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  date: string;
  vendorName:string;
  brand: string;
  unit: string;
  unitPerItem: number;
  expiryDate?: string;
  createdBy: string;
  updatedBy?: string;
}

const UNITS = ['piece', 'ml', 'l', 'g', 'kg'];

const DetailItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex justify-between py-3 text-sm">
    <dt className="text-gray-500">{label}</dt>
    <dd className="text-gray-900 font-medium text-right">{value}</dd>
  </div>
);

const DetailPanel = ({ isOpen, onClose, record, history }: {
  isOpen: boolean;
  onClose: () => void;
  record: ProcurementRecord | null;
  history: ProcurementRecord[];
}) => {
  const [viewedRecord, setViewedRecord] = useState<ProcurementRecord | null>(record);

  useEffect(() => {
    setViewedRecord(record);
  }, [record]);

  if (!viewedRecord) return null;

  const totalPurchaseAmount = history.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-50 shadow-2xl z-50 transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-indigo-600 font-semibold uppercase">Supplier Details</p>
                <h2 className="text-xl font-bold text-gray-800">{viewedRecord.vendorName}</h2>
                <p className="text-sm text-gray-500">Purchase History</p>
              </div>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-5">
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Selected Purchase: <span className='font-bold'>{viewedRecord.name}</span></h3>
              <dl className="divide-y divide-gray-200">
                <DetailItem label="Purchase Date" value={new Date(viewedRecord.date).toLocaleDateString('en-GB')} />
                <DetailItem label="Quantity" value={`${viewedRecord.quantity} x ${viewedRecord.unitPerItem}${viewedRecord.unit}`} />
                <DetailItem label="Unit Price" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(viewedRecord.price)} />
                <DetailItem label="Total Cost" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(viewedRecord.price * viewedRecord.quantity)} />
                <DetailItem label="Added By" value={viewedRecord.createdBy} />
              </dl>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">All Purchases from this Supplier (on this page)</h3>
              {history.length > 0 ? (
                <ul className="space-y-3">
                  {history.map(item => (
                    <li key={item._id} onClick={() => setViewedRecord(item)} className={`bg-white border rounded-lg p-3 cursor-pointer transition-all hover:bg-indigo-50 ${item._id === viewedRecord._id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'hover:border-gray-300'}`}>
                       <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-gray-800">{item.name}</span>
                        <span className="text-gray-500 font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.price * item.quantity)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                         <p className="flex items-center gap-2"><ShoppingBagIcon className="h-4 w-4 text-gray-400"/>Quantity: <span className="font-medium text-gray-600">{`${item.quantity} x ${item.unitPerItem}${item.unit}`}</span></p>
                        <p className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-gray-400"/>On: <span className="font-medium text-gray-600">{new Date(item.date).toLocaleDateString('en-GB')}</span></p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (<div className="text-center py-8 text-gray-500 text-sm">No purchases found.</div>)}
            </div>
          </div>

          <div className="p-5 border-t bg-white mt-auto">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total from this Supplier:</span>
              <span className="text-lg font-bold text-indigo-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalPurchaseAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};


export default function ProcurementPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<ProcurementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProcurementRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ProcurementRecord | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<ProcurementRecord[]>([]);
  
  // Changed state to use string for numeric inputs to avoid type errors
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    brand: '',
    unit: 'piece',
    unitPerItem: '',
    expiryDate: '',
  });

  const totalPrice = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0);

  const canReadProcurement = session && hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_READ);
  const canCreateProcurement = session && hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_CREATE);
  const canUpdateProcurement = session && hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_UPDATE);
  const canDeleteProcurement = session && hasPermission(session.user.role.permissions, PERMISSIONS.PROCUREMENT_DELETE);

  useEffect(() => {
    if (canReadProcurement) fetchRecords();
  }, [page, canReadProcurement]);

  const fetchRecords = async () => {
    try { setIsLoading(true); const response = await fetch(`/api/procurement?page=${page}&limit=10`); const data = await response.json(); if (data.success) { setRecords(data.records); setTotalPages(data.totalPages || 1); } } 
    catch (error) { console.error('Error fetching procurement records:', error); } 
    finally { setIsLoading(false); }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRecord ? '/api/procurement' : '/api/procurement';
      const method = editingRecord ? 'PUT' : 'POST';
      // Convert string form state back to numbers for the API
      const body = {
        ...(editingRecord && { recordId: editingRecord._id }),
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        unitPerItem: parseFloat(formData.unitPerItem) || 0,
        expiryDate: formData.expiryDate || undefined,
      };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (response.ok) {
        setIsFormOpen(false);
        setEditingRecord(null);
        fetchRecords();
      } else {
        const errorData = await response.json();
        alert(errorData.message);
      }
    } catch (error) {
      console.error('Error saving procurement record:', error);
      alert('Failed to save record');
    }
  };

  const handleEdit = (record: ProcurementRecord) => {
    setIsDetailPanelOpen(false); 
    setEditingRecord(record);
    // Convert numbers from the record to strings for the form state
    setFormData({ 
      name: record.name, 
      quantity: String(record.quantity), 
      price: String(record.price), 
      date: new Date(record.date).toISOString().split('T')[0], 
      vendorName: record.vendorName, 
      brand: record.brand, 
      unit: record.unit, 
      unitPerItem: String(record.unitPerItem), 
      expiryDate: record.expiryDate ? new Date(record.expiryDate).toISOString().split('T')[0] : '', 
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try { const response = await fetch(`/api/procurement?recordId=${recordId}`, { method: 'DELETE' }); if (response.ok) { setRecords(records.filter((r) => r._id !== recordId)); setIsDetailPanelOpen(false); } else { const errorData = await response.json(); alert(errorData.message); } } 
    catch (error) { console.error('Error deleting procurement record:', error); alert('Failed to delete record'); }
  };
  
  const handleAddNew = () => {
    setEditingRecord(null);
    setFormData({ name: '', quantity: '', price: '', date: new Date().toISOString().split('T')[0], vendorName: '', brand: '', unit: 'piece', unitPerItem: '', expiryDate: '' });
    setIsFormOpen(true);
  };

  const handleRowClick = (record: ProcurementRecord) => {
      const historyOnPage = records.filter(r => r.vendorName === record.vendorName);
      setSelectedRecord(record); setPurchaseHistory(historyOnPage); setIsDetailPanelOpen(true);
  };

  if (!canReadProcurement) {
    return ( <div className="p-6 bg-gray-50 min-h-screen"><p className="text-red-500">You do not have permission to view procurement records.</p></div> );
  }

  return (
    <>
      <div className=" bg-gray-50 min-h-screen space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Procurement</h1>
            <p className="text-sm text-gray-500">Manage all purchased products and their details.</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <div className="text-sm text-gray-500 w-full md:w-auto text-left md:text-right">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {canCreateProcurement && (<button onClick={handleAddNew} className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"><PlusIcon className="h-5 w-5" />Add New Record</button>)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Price/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">By</th>
                  {(canUpdateProcurement || canDeleteProcurement) && (<th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>)}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (<tr><td colSpan={9} className="text-center py-10 text-gray-500">Loading records...</td></tr>) : records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record._id} className="hover:bg-indigo-50 transition-colors" onClick={() => handleRowClick(record)}>
                      <td className="px-4 py-4 whitespace-nowrap cursor-pointer"><div className="text-sm font-medium text-indigo-700 hover:underline">{record.name}</div><div className="text-xs text-gray-500">{record.brand}</div></td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600 cursor-pointer">{`${record.quantity} x ${record.unitPerItem}${record.unit}`}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-800 cursor-pointer">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.price)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 cursor-pointer">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.price * record.quantity)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 cursor-pointer">{record.vendorName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 cursor-pointer">{record.expiryDate ? new Date(record.expiryDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium cursor-pointer">{record.createdBy}</td>
                      {(canUpdateProcurement || canDeleteProcurement) && (
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-4">
                            {canUpdateProcurement && <button onClick={(e) => { e.stopPropagation(); handleEdit(record); }} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Edit"><PencilIcon className="h-5 w-5" /></button>}
                            {canDeleteProcurement && <button onClick={(e) => { e.stopPropagation(); handleDelete(record._id); }} className="text-red-600 hover:text-red-900 transition-colors" title="Delete"><TrashIcon className="h-5 w-5" /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (<tr><td colSpan={9}><div className="text-center py-12"><DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm font-medium">No procurement records found.</p><p className="text-gray-400 text-xs mt-1">Click 'Add New Record' to get started.</p></div></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-gray-200">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-md text-sm font-medium flex items-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"><ChevronLeftIcon className="h-4 w-4 mr-1" />Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-md text-sm font-medium flex items-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">Next<ChevronRightIcon className="h-4 w-4 ml-1" /></button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-200"><h2 id="modal-title" className="text-lg font-semibold text-gray-800">{editingRecord ? 'Edit Procurement Record' : 'Add New Procurement Record'}</h2><button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button></div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Product Name</label><input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required /></div><div><label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">Brand</label><input id="brand" type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required /></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end"><div><label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label><input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" min="0" step="any" required /></div><div><label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (INR)</label><input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" min="0" step="0.01" required /></div><div className="md:col-span-2"><label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700 mb-1">Total Price (INR)</label><input id="totalPrice" type="text" value={`₹ ${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="w-full px-3 py-2 rounded-md border-gray-200 bg-gray-100 text-base text-gray-700 font-semibold" /></div></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4"><div><label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label><select id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required>{UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div><div><label htmlFor="unitPerItem" className="block text-sm font-medium text-gray-700 mb-1">Size per Item</label><input id="unitPerItem" type="number" value={formData.unitPerItem} onChange={(e) => setFormData({ ...formData, unitPerItem: e.target.value })} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" min="0" step="any" required /></div><div className="md:col-span-1"><label htmlFor="vendorName" className="block text-sm font-medium text-gray-700 mb-1">Vendor/Supplier</label><input id="vendorName" type="text" value={formData.vendorName} onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required /></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div><label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label><input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required /></div><div><label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-gray-400">(Optional)</span></label><input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" /></div></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200"><button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors">Cancel</button><button type="submit" className="px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">{editingRecord ? 'Update Record' : 'Save Record'}</button></div>
            </form>
          </div>
        </div>
      )}

      <DetailPanel 
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        record={selectedRecord}
        history={purchaseHistory}
      />
    </>
  );
}