"use client"

import type React from "react"
import { useState, useEffect, type FormEvent } from "react"
import type { IProduct } from "@/models/Product"
import { useDebounce } from "@/hooks/useDebounce"
import { XMarkIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline"
import type { IServiceCategory } from "@/models/ServiceCategory"

type EntityType = "service-category" | "service-sub-category" | "service-item"
type AudienceType = "male" | "female" 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entityType: EntityType, data: any) => void;
  entityType: EntityType | null;
  entityToEdit: any | null;
  context: {
    audience: AudienceType;
    mainCategory?: IServiceCategory | null;
    subCategoryId?: string;
  };
}

interface FormConsumable {
  product: IProduct;
  quantity: {
    male?: number;
    female?: number;
    default: number;
  };
  unit: string;
}

export default function ServiceFormModal({ isOpen, onClose, onSave, entityType, entityToEdit, context }: Props) {
  const [formData, setFormData] = useState<any>({});
  const [consumables, setConsumables] = useState<FormConsumable[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [foundProduct, setFoundProduct] = useState<IProduct | null>(null);
  const debouncedSku = useDebounce(skuSearch, 300);

  useEffect(() => {
    if (isOpen) {
      if (entityToEdit) {
        setFormData(entityToEdit);
        if (entityType === "service-item") {
          const formattedConsumables = (entityToEdit.consumables || []).map((c: any) => ({
            product: c.product,
            quantity: {
              male: c.quantity?.male,
              female: c.quantity?.female,
              default: c.quantity?.default || c.quantity || 1,
            },
            unit: c.unit || "pcs",
          }));
          setConsumables(formattedConsumables);
        }
      } else {
        setFormData({ name: "", serviceCode: "", price: "", membershipRate: "", duration: "" });
        setConsumables([]);
      }
      setSkuSearch("");
      setFoundProduct(null);
    }
  }, [entityToEdit, isOpen, entityType]);

  useEffect(() => {
    if (debouncedSku.trim()) {
      fetch(`/api/products?sku=${debouncedSku.toUpperCase()}`)
        .then((res) => res.json())
        .then((data) => {
          setFoundProduct(data.success && data.data.length > 0 ? data.data[0] : null);
        });
    } else {
      setFoundProduct(null);
    }
  }, [debouncedSku]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === '' ? '' : Number.parseFloat(value)) : value,
    }));
  };

  const handleAddConsumable = () => {
    if (!foundProduct) return;
    const newConsumable: FormConsumable = { product: foundProduct, quantity: { default: 1 }, unit: foundProduct.unit || "pcs" };
    setConsumables([...consumables, newConsumable]);
    setSkuSearch("");
    setFoundProduct(null);
  };

  const handleConsumableChange = (index: number, field: string, value: string | number) => {
    const updated = [...consumables];
    const currentConsumable = updated[index];
    if (field === "quantity") {
        const qtyValue = value === "" ? undefined : Number(value);
        if (context.audience === 'male') {
            currentConsumable.quantity.male = qtyValue;
        } else if (context.audience === 'female') {
            currentConsumable.quantity.female = qtyValue;
        }
      
        currentConsumable.quantity.default = qtyValue || 0;
    
    } else {
        (currentConsumable as any)[field] = value;
    }
    updated[index] = currentConsumable;
    setConsumables(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!entityType) return;
    const payload = { ...formData };
    if (entityToEdit) payload._id = entityToEdit._id;
    else {
      if (entityType === "service-category") payload.targetAudience = context.audience;
      if (entityType === "service-sub-category") payload.mainCategory = context.mainCategory?._id;
      if (entityType === "service-item") payload.subCategory = context.subCategoryId;
    }
    if (entityType === "service-item") {
      payload.consumables = consumables.map((c) => ({
        product: c.product._id,
        quantity: {
          male: c.quantity.male,
          female: c.quantity.female,
          default: c.quantity.default,
        },
        unit: c.unit,
      }));
    }
    onSave(entityType, payload);
  };

  const getTitle = () => {
    const action = entityToEdit ? "Edit" : "Add New";
    switch (entityType) {
      case "service-category": return `${action} ${context.audience} Category`;
      case "service-sub-category": return `${action} Sub-Category for "${context.mainCategory?.name || ""}"`;
      case "service-item": return `${action} Service`;
      default: return "";
    }
  };
  
  const renderConsumableFields = () => {
    if (entityType !== "service-item") return null;
    return (
      <div className="border-t border-slate-200 pt-6 mt-6">
        <h3 className="font-semibold text-lg text-slate-800 mb-3">Product Consumables</h3>
        <p className="text-sm text-slate-600 mb-4">Link products from your inventory that are used during this service.</p>
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1"><MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" /><input type="text" value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} placeholder="Search Product by SKU" className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg"/></div>
            <button type="button" onClick={handleAddConsumable} disabled={!foundProduct} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400">Add</button>
          </div>
          {foundProduct && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-800"><span className="font-medium">Found:</span> {foundProduct.name}</p></div>}
        </div>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {consumables.map((con, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div><h4 className="font-medium text-slate-800">{con.product.name}</h4><div className="text-xs text-slate-500 mt-1">SKU: {con.product.sku}</div></div>
                <button type="button" onClick={() => setConsumables(consumables.filter((_, i) => i !== index))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remove consumable"><TrashIcon className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="block text-xs font-medium text-slate-700 mb-2">Quantity ({context.audience}) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    value={context.audience === 'male' ? con.quantity.male ?? con.quantity.default : con.quantity.female ?? con.quantity.default} 
                    onChange={(e) => handleConsumableChange(index, "quantity", e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                    min="0" 
                    step="0.1" 
                    required 
                    />
                  </div>
      
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Unit</label>
                  <input 
                    type="text" 
                    value={con.unit} 
                    onChange={(e) => handleConsumableChange(index, "unit", e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                    placeholder="ml, pcs, etc."
                  />
                </div>
              </div>
          ))}
          {consumables.length === 0 && <div className="text-center py-8 text-slate-500"><p className="text-sm">No consumables added yet.</p></div>}
        </div>
      </div>
    )
  }

  const renderFields = () => {
    switch (entityType) {
      case "service-category": return (<div><label className="block text-sm font-medium text-slate-700 mb-2">Category Name</label><input name="name" value={formData.name || ""} onChange={handleChange} placeholder="e.g., Hair" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>)
      case "service-sub-category": return (<div><label className="block text-sm font-medium text-slate-700 mb-2">Sub-Category Name</label><input name="name" value={formData.name || ""} onChange={handleChange} placeholder="e.g., Haircut" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>)
      case "service-item": return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Service Name</label><input name="name" value={formData.name || ""} onChange={handleChange} placeholder="e.g., Layered Cut" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Service Code (SKU)</label><input name="serviceCode" value={formData.serviceCode || ""} onChange={(e) => setFormData(prev => ({...prev, serviceCode: e.target.value.toUpperCase()}))} placeholder="e.g., SVC-CUT-01" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Price</label><input name="price" type="number" step="0.01" value={formData.price || ""} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Member Price <span className="text-slate-400">(Optional)</span></label><input name="membershipRate" type="number" step="0.01" value={formData.membershipRate || ""} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-3 border border-slate-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label><input name="duration" type="number" value={formData.duration || ""} onChange={handleChange} placeholder="30" className="w-full px-4 py-3 border border-slate-300 rounded-lg" required /></div>
            </div>
            {renderConsumableFields()}
          </div>
        )
      default: return null
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50"><h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2><button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><XMarkIcon className="h-5 w-5 text-slate-500" /></button></div>
        <div className="p-6 overflow-y-auto"><form onSubmit={handleSubmit} className="space-y-6">{renderFields()}<div className="flex justify-end gap-3 pt-6 border-t border-slate-200"><button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button><button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm">Save</button></div></form></div>
      </div>
    </div>
  )
}