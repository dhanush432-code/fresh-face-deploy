"use client"

import type React from "react"

import { useState, useEffect, type FormEvent } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { formatDateForInput } from "@/lib/utils"

type EntityType = "brand" | "subcategory" | "product"
type ProductType = "Retail" | "In-House"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (entityType: EntityType, data: any) => void
  entityType: EntityType | null
  entityToEdit: any | null
  context: {
    productType: ProductType
    brandId?: string
    subCategoryId?: string
    brandName?: string
  }
}

export default function ProductFormModal({ isOpen, onClose, onSave, entityType, entityToEdit, context }: Props) {
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    if (!isOpen) return

    if (entityToEdit) {
      if (entityType === "product") {
        setFormData({
          ...entityToEdit,
          stockedDate: entityToEdit.stockedDate ? formatDateForInput(new Date(entityToEdit.stockedDate)) : "",
          expiryDate: entityToEdit.expiryDate ? formatDateForInput(new Date(entityToEdit.expiryDate)) : "",
          lowStockThreshold: entityToEdit.lowStockThreshold ?? 10,
        })
      } else {
        setFormData(entityToEdit)
      }
    } else {
      switch (entityType) {
        case "brand":
        case "subcategory":
          setFormData({ name: "" })
          break
        case "product":
          setFormData({
            name: "",
            sku: "",
            price: "",
            numberOfItems: "",
            quantityPerItem: "",
            unit: "piece",
            stockedDate: formatDateForInput(new Date()),
            expiryDate: "",
            lowStockThreshold: 10,
          })
          break
      }
    }
  }, [isOpen, entityType, entityToEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const isNumberInput = type === "number"
    setFormData((prev) => ({
      ...prev,
      [name]: isNumberInput ? (value === "" ? "" : Number.parseFloat(value)) : value,
    }))
  }

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (!entityType) return;

  // Create a mutable copy of the form data
  const dataToSave = { ...formData };

  // --- THIS IS THE FIX ---
  // If we are saving a product, we explicitly remove the totalQuantity field.
  // This allows the Mongoose pre-save hook on the server to correctly calculate it.
  if (entityType === 'product') {
    delete dataToSave.totalQuantity;
  }
  // --- END OF FIX ---

  // The rest of your logic remains the same, just using 'dataToSave'
  if (entityToEdit) {
    dataToSave._id = entityToEdit._id;
  }
  if (!entityToEdit) {
    dataToSave.type = context.productType;
    if (entityType === "subcategory") dataToSave.brand = context.brandId;
    if (entityType === "product") {
      dataToSave.brand = context.brandId;
      dataToSave.subCategory = context.subCategoryId;
    }
  }
  
  onSave(entityType, dataToSave);
};

  if (!isOpen) return null

  const getTitle = () => {
    const action = entityToEdit ? "Edit" : "Add New"
    switch (entityType) {
      case "brand":
        return `${action} Brand`
      case "subcategory":
        return `${action} Subcategory`
      case "product":
        return `${action} Product`
      default:
        return ""
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-semibold text-slate-900">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors duration-150">
            <XMarkIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(entityType === "brand" || entityType === "subcategory") && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                  required
                />
              </div>
            )}

            {entityType === "product" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-slate-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    id="sku"
                    value={formData.sku || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-2">
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    id="price"
                    value={formData.price || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="numberOfItems" className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Items
                  </label>
                  <input
                    type="number"
                    name="numberOfItems"
                    id="numberOfItems"
                    placeholder="e.g., 10 bottles"
                    value={formData.numberOfItems || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="quantityPerItem" className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity Per Item
                  </label>
                  <input
                    type="number"
                    name="quantityPerItem"
                    id="quantityPerItem"
                    placeholder="e.g., 100 ml per bottle"
                    value={formData.quantityPerItem || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="unit"
                    id="unit"
                    value={formData.unit || "piece"}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  >
                    <option value="piece">piece</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="stockedDate" className="block text-sm font-medium text-slate-700 mb-2">
                    Stocked Date
                  </label>
                  <input
                    type="date"
                    name="stockedDate"
                    id="stockedDate"
                    value={formData.stockedDate || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-700 mb-2">
                    Expiry Date <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    id="expiryDate"
                    value={formData.expiryDate || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-slate-700 mb-2">
                    Low Stock Threshold
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Send an alert when the number of items is at or below this value.
                  </p>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    id="lowStockThreshold"
                    value={formData.lowStockThreshold || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    min="0"
                    required
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150 shadow-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
