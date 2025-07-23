"use client"

import type React from "react"

import { useState, useEffect, type FormEvent } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import type { IProduct } from "@/models/Product"
import { formatDateForInput } from "@/lib/utils"

type EntityType = "brand" | "subcategory" | "product"
type ProductType = "Retail" | "In-House"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (entityType: EntityType, data: any) => void
  entityType: EntityType | null
  entityToEdit: IProduct | { _id: string; name:string } | null
  context?: {
    productType?: ProductType
    brandId?: string
    subCategoryId?: string
    brandName?: string
  }
}

const getNewProductFormState = () => ({
  name: "",
  sku: "",
  numberOfItems: "",
  quantityPerItem: "",
  unit: "piece",
  price: "",
  stockedDate: formatDateForInput(new Date()),
  expiryDate: "",
})

export default function EntityFormModal({ isOpen, onClose, onSave, entityType, entityToEdit, context }: Props) {
  const [formData, setFormData] = useState<any>({})
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0)

  const unitOptions = ["piece", "ml", "l", "g", "kg"]

  useEffect(() => {
    if (!isOpen) {
      setFormData({})
      return
    }

    if (entityToEdit) {
      if (entityType === "product") {
        const productToEdit = entityToEdit as IProduct
        const expiry = productToEdit.expiryDate ? new Date(productToEdit.expiryDate) : null
        setFormData({
          ...productToEdit,
          brand: productToEdit.brand?._id,
          subCategory: productToEdit.subCategory?._id,
          expiryDate: expiry && !isNaN(expiry.getTime()) ? formatDateForInput(expiry) : "",
        })
      } else {
        setFormData({ name: entityToEdit.name || "" })
      }
    } else {
      switch (entityType) {
        case "brand":
        case "subcategory":
          setFormData({ name: "" })
          break
        case "product":
          setFormData(getNewProductFormState())
          break
        default:
          setFormData({})
          break
      }
    }
  }, [isOpen, entityType, entityToEdit])

  useEffect(() => {
    if (entityType === "product") {
      const items = Number.parseFloat(formData.numberOfItems) || 0
      const perItem = Number.parseFloat(formData.quantityPerItem) || 0
      setCalculatedTotal(items * perItem)
    }
  }, [formData.numberOfItems, formData.quantityPerItem, entityType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target
    if (name === "sku") {
      value = value.toUpperCase()
    }
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!entityType) return

    let dataToSave: any

    if (entityType === "product") {
      dataToSave = {
        name: formData.name,
        sku: formData.sku,
        price: Number.parseFloat(formData.price) || 0,
        numberOfItems: Number.parseInt(formData.numberOfItems, 10) || 0,
        quantityPerItem: Number.parseFloat(formData.quantityPerItem) || 0,
        unit: formData.unit,
        stockedDate: new Date(formData.stockedDate),
        type: context?.productType,
        brand: context?.brandId,
        subCategory: context?.subCategoryId,
      }

      if (formData.expiryDate && formData.expiryDate.trim() !== "") {
        dataToSave.expiryDate = new Date(formData.expiryDate)
      } else {
        if (entityToEdit) {
          dataToSave.expiryDate = null
        }
      }

      if (entityToEdit) {
        dataToSave._id = (entityToEdit as IProduct)._id
      }
    } else {
      dataToSave = { name: formData.name, type: context?.productType }
      if (entityType === "subcategory") {
        dataToSave.brand = context?.brandId
      }
      if (entityToEdit) {
        dataToSave._id = entityToEdit._id
      }
    }
    onSave(entityType, dataToSave)
  }

  if (!isOpen) return null

  // --- FIX APPLIED HERE ---
  // Wrapped the return strings in backticks (`) to create valid template literals.
  const getTitle = () => {
    const action = entityToEdit ? "Edit" : "Add New"
    switch (entityType) {
      case "brand":
        return `${action} ${context?.productType} Brand`
      case "subcategory":
        return `${action} Sub-Category for ${context?.brandName || "Brand"}`
      case "product":
        return `${action} Product`
      default:
        return ""
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-semibold text-blue-900">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors duration-150">
            <XMarkIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {(entityType === "brand" || entityType === "subcategory") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  placeholder="Enter name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                  required
                  autoFocus
                />
              </div>
            )}

            {entityType === "product" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Product Name</label>
                    <input
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      placeholder="Enter product name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">SKU</label>
                    <input
                      name="sku"
                      value={formData.sku || ""}
                      onChange={handleChange}
                      placeholder="Enter SKU"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Price</label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price || ""}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Number of Items</label>
                    <input
                      name="numberOfItems"
                      type="number"
                      value={formData.numberOfItems || ""}
                      onChange={handleChange}
                      placeholder="e.g., 10 bottles"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Quantity Per Item</label>
                    <input
                      name="quantityPerItem"
                      type="number"
                      step="any"
                      value={formData.quantityPerItem || ""}
                      onChange={handleChange}
                      placeholder="e.g., 100 ml per bottle"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    >
                      <option value="" disabled>
                        Select Unit
                      </option>
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Stocked Date</label>
                    <input
                      name="stockedDate"
                      type="date"
                      value={formData.stockedDate || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Expiry Date <span className="text-slate-400">(Optional)</span>
                    </label>
                    <input
                      name="expiryDate"
                      type="date"
                      value={formData.expiryDate || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
                    />
                  </div>
                </div>

                {calculatedTotal > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-900">
                          Total Inventory: {calculatedTotal} {formData.unit || "units"}
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          {formData.numberOfItems || 0} items × {formData.quantityPerItem || 0}{" "}
                          {formData.unit || "units"} each
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{calculatedTotal}</div>
                    </div>
                  </div>
                )}
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
