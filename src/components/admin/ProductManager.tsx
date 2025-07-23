"use client"

import type { IProduct } from "@/models/Product"
import type { IProductBrand } from "@/models/ProductBrand"
import type { IProductSubCategory } from "@/models/ProductSubCategory"
import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { hasPermission, PERMISSIONS } from "@/lib/permissions"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  TagIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline"
import CategoryColumn from "./CategoryColumn"
import EntityFormModal from "./EntityFormModal"
import { toast } from "react-toastify"
import ProductImportModal from "./ProductImportModal"

type ProductType = "Retail" | "In-House"
type EntityType = "brand" | "subcategory" | "product"

export default function ProductManager() {
  const { data: session } = useSession()

  // State for Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalEntityType, setModalEntityType] = useState<EntityType | null>(null)
  const [entityToEdit, setEntityToEdit] = useState<any | null>(null)

  // State for Data & Selections
  const [productType, setProductType] = useState<ProductType>("Retail")
  const [brands, setBrands] = useState<IProductBrand[]>([])
  const [subCategories, setSubCategories] = useState<IProductSubCategory[]>([])
  const [products, setProducts] = useState<IProduct[]>([])

  const [selectedBrand, setSelectedBrand] = useState<IProductBrand | null>(null)
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null)

  // State for Loading Indicators
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Permissions
  const canCreate = session && hasPermission(session.user.role.permissions, PERMISSIONS.PRODUCTS_CREATE)
  const canUpdate = session && hasPermission(session.user.role.permissions, PERMISSIONS.PRODUCTS_UPDATE)
  const canDelete = session && hasPermission(session.user.role.permissions, PERMISSIONS.PRODUCTS_DELETE)

  // --- Data Fetching and Handling ---
  const resetSelections = useCallback(() => {
    setSelectedBrand(null)
    setSelectedSubCategoryId(null)
    setSubCategories([])
    setProducts([])
  }, [])

  const fetchBrands = useCallback(
    async (type: ProductType) => {
      setIsLoadingBrands(true)
      resetSelections()
      try {
        const res = await fetch(`/api/product-brands?type=${type}`)
        const data = await res.json()
        setBrands(data.success ? data.data : [])
      } catch (error) {
        toast.error("Failed to load brands.")
        setBrands([])
      } finally {
        setIsLoadingBrands(false)
      }
    },
    [resetSelections]
  )

  const fetchSubCategories = useCallback(async (brandId: string) => {
    setIsLoadingSubCategories(true)
    setSelectedSubCategoryId(null)
    setProducts([])
    try {
      const res = await fetch(`/api/product-sub-categories?brandId=${brandId}`)
      const data = await res.json()
      setSubCategories(data.success ? data.data : [])
    } catch (error) {
      toast.error("Failed to load sub-categories.")
      setSubCategories([])
    } finally {
      setIsLoadingSubCategories(false)
    }
  }, [])

  const fetchProducts = useCallback(async (subCategoryId: string) => {
    setIsLoadingProducts(true)
    setProducts([])
    try {
      const res = await fetch(`/api/products?subCategoryId=${subCategoryId}`)
      const data = await res.json()
      setProducts(data.success ? data.data : [])
    } catch (error) {
      toast.error("Failed to load products.")
      setProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    fetchBrands(productType)
  }, [productType, fetchBrands])

  // --- Event Handlers ---
  const handleSelectBrand = (brand: IProductBrand) => {
    setSelectedBrand(brand)
    fetchSubCategories(brand._id)
  }

  const handleSelectSubCategory = (subCategoryId: string) => {
    setSelectedSubCategoryId(subCategoryId)
    fetchProducts(subCategoryId)
  }

  const handleOpenModal = (type: EntityType, entity: any | null = null) => {
    setModalEntityType(type)
    setEntityToEdit(entity)
    setIsModalOpen(true)
  }

  const handleImportSuccess = () => {
    toast.success("Import process finished. Refreshing data...")
    fetchBrands(productType)
  }

  const handleTypeChange = (newType: ProductType) => {
    if (newType !== productType) setProductType(newType)
  }

  // --- CRUD Operations ---
  const getApiPath = (entityType: EntityType) => {
    const paths = {
      brand: "product-brands",
      subcategory: "product-sub-categories",
      product: "products",
    }
    return paths[entityType] || ""
  }

  const handleSave = useCallback(
    async (entityType: EntityType, data: any) => {
      if (!entityType) return

      const isEditing = !!data._id
      const method = isEditing ? "PUT" : "POST"
      const apiPath = getApiPath(entityType)
      const url = isEditing ? `/api/${apiPath}/${data._id}` : `/api/${apiPath}`

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        const result = await res.json()

        if (!res.ok || !result.success) {
          throw new Error(result.message || "An unknown error occurred.")
        }

        toast.success(`'${data.name}' saved successfully!`)
        setIsModalOpen(false)

        // Refresh the relevant column's data
        if (entityType === "brand") {
          fetchBrands(productType)
        } else if (entityType === "subcategory" && selectedBrand) {
          fetchSubCategories(selectedBrand._id)
        } else if (entityType === "product" && selectedSubCategoryId) {
          fetchProducts(selectedSubCategoryId)
        }
      } catch (error: any) {
        toast.error(`Save failed: ${error.message}`)
      }
    },
    [productType, selectedBrand, selectedSubCategoryId, fetchBrands, fetchSubCategories, fetchProducts]
  )

  const handleDelete = useCallback(
    async (entityType: EntityType, id: string) => {
      if (!entityType) return
      
      const entityName =
        entityType === "brand" ? brands.find(b => b._id === id)?.name :
        entityType === "subcategory" ? subCategories.find(s => s._id === id)?.name :
        products.find(p => p._id === id)?.name;

      if (!window.confirm(`Are you sure you want to delete '${entityName || "this item"}'? This action cannot be undone.`)) {
        return
      }

      const apiPath = getApiPath(entityType)
      const url = `/api/${apiPath}/${id}`

      try {
        const res = await fetch(url, { method: "DELETE" })
        const result = await res.json()

        if (!res.ok || !result.success) {
          throw new Error(result.message || "An unknown error occurred.")
        }

        toast.success(`'${entityName}' deleted successfully!`)

        // Refresh the relevant data
        if (entityType === "brand") {
          fetchBrands(productType) // This will reset all columns
        } else if (entityType === "subcategory" && selectedBrand) {
          fetchSubCategories(selectedBrand._id) // This will reset the product column
        } else if (entityType === "product" && selectedSubCategoryId) {
          fetchProducts(selectedSubCategoryId)
        }
      } catch (error: any) {
        toast.error(`Delete failed: ${error.message}`)
      }
    },
    [productType, selectedBrand, selectedSubCategoryId, brands, subCategories, products, fetchBrands, fetchSubCategories, fetchProducts]
  )

  return (
    <div className="flex h-full flex-col rounded-xl bg-white shadow-lg">
      <EntityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        entityType={modalEntityType}
        entityToEdit={entityToEdit}
        context={{
          productType,
          brandId: selectedBrand?._id,
          subCategoryId: selectedSubCategoryId,
          brandName: selectedBrand?.name,
        }}
      />
      <ProductImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Header */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CubeIcon className="h-6 w-6 text-slate-600" />
            <h1 className="text-xl font-semibold text-slate-900">Product Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-200 p-1">
              {(["Retail", "In-House"] as ProductType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    productType === type
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-green-700"
            >
              Import from Excel
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex min-h-0 flex-1 flex-row">
        <CategoryColumn
          className="w-1/4"
          title="Brands"
          items={brands}
          selectedId={selectedBrand?._id || null}
          onSelect={(id) => {
            const brand = brands.find((b) => b._id === id)
            if (brand) handleSelectBrand(brand)
          }}
          onEdit={canUpdate ? (item) => handleOpenModal("brand", item) : undefined}
          onDelete={canDelete ? (id) => handleDelete("brand", id) : undefined}
          onAddNew={canCreate ? () => handleOpenModal("brand") : undefined}
          isLoading={isLoadingBrands}
        />

        <CategoryColumn
          className="w-1/4"
          title="Sub-Categories"
          items={subCategories}
          selectedId={selectedSubCategoryId}
          onSelect={handleSelectSubCategory}
          onEdit={canUpdate ? (item) => handleOpenModal("subcategory", item) : undefined}
          onDelete={canDelete ? (id) => handleDelete("subcategory", id) : undefined}
          onAddNew={canCreate ? () => handleOpenModal("subcategory") : undefined}
          isLoading={isLoadingSubCategories}
          disabled={!selectedBrand}
          disabledText="Select a brand to view its sub-categories"
        />

        {/* Products Column */}
        <div className="flex h-full w-1/2 flex-col bg-slate-50/30">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
            <h3 className="text-lg font-semibold tracking-tight text-slate-800">Products</h3>
            {canCreate && (
              <button
                onClick={() => handleOpenModal("product")}
                disabled={!selectedSubCategoryId}
                className="rounded-md p-1.5 text-slate-500 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                title="Add new Product"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingProducts ? (
              <div className="flex h-full items-center justify-center">
                <div className="inline-flex items-center gap-2 text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                  <span className="text-sm">Loading products...</span>
                </div>
              </div>
            ) : !selectedSubCategoryId ? (
              <div className="flex h-full items-center justify-center text-center">
                <p className="px-4 text-sm text-slate-500">Select a sub-category to view products.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <FolderOpenIcon className="mb-2 h-10 w-10 text-slate-400" />
                <p className="font-medium">No Products Found</p>
                <p className="text-xs">Click the '+' button above to add one.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{product.name}</h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            <TagIcon className="h-3 w-3" />
                            {product.sku}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p>
                            <span className="font-medium">{product.numberOfItems} items</span> ×{" "}
                            {product.quantityPerItem}
                            {product.unit} each
                          </p>
                          <p className="font-medium text-blue-600">
                            Total Stock: {product.totalQuantity}
                            {product.unit}
                          </p>
                          <p className="text-xs text-slate-500">
                            Expires:{" "}
                            {product.expiryDate
                              ? new Date(product.expiryDate).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <p className="text-xl font-bold text-green-600">
                          ₹{product.price.toFixed(2)}
                        </p>
                        <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {canUpdate && (
                            <button
                              onClick={() => handleOpenModal("product", product)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                              title="Edit product"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete("product", product._id)}
                              className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                              title="Delete product"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}