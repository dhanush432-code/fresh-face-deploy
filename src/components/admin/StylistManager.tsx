"use client"

import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  AcademicCapIcon,
  ArrowDownTrayIcon, // <-- Added new icon
} from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { hasPermission, PERMISSIONS } from "@/lib/permissions"

// Import Modals and Services
import StylistFormModal from "./StylistFormModal"
import StylistHistoryModal from "../StylistHistoryModal"
import ReportDownloadModal from "./../ReportDownloadModal" // <-- Import new modal
import { downloadReport } from "@/lib/reportService" // <-- Import new service

// Import the IStylist interface from your models
import type { IStylist } from "@/models/Stylist"

interface IStylistHistoryItem {
  _id: string
  date: string
  customerName: string
  services: string
  amount: number
  estimatedDuration: number
  actualDuration: number
}

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-3 bg-slate-200 rounded w-24"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded"></div>
            <div className="w-8 h-8 bg-slate-200 rounded"></div>
            <div className="w-8 h-8 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

export default function StylistManager() {
  const { data: session } = useSession()

  // Existing States
  const [stylists, setStylists] = useState<IStylist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingStylist, setEditingStylist] = useState<IStylist | null>(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedStylist, setSelectedStylist] = useState<IStylist | null>(null)
  const [historyData, setHistoryData] = useState<IStylistHistoryItem[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // --- NEW STATES FOR REPORT DOWNLOAD ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  // --- END NEW STATES ---

  const canCreate = session && hasPermission(session.user.role.permissions, PERMISSIONS.STYLISTS_CREATE)
  const canUpdate = session && hasPermission(session.user.role.permissions, PERMISSIONS.STYLISTS_UPDATE)
  const canDelete = session && hasPermission(session.user.role.permissions, PERMISSIONS.STYLISTS_DELETE)

  const fetchStylists = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/stylists")
      const data = await res.json()
      if (data.success) {
        setStylists(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stylists", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStylists()
  }, [])

  // --- NEW HANDLER FOR REPORT DOWNLOAD ---
  const handleDownloadReport = async (params: { startDate: Date; endDate: Date; format: "pdf" | "excel" }) => {
    setIsDownloading(true)
    try {
      await downloadReport('api/stylists/report',params)
      setIsReportModalOpen(false) // Close modal on successful download trigger
    } catch (error: any) {
      alert(`Download failed: ${error.message}`) // Provide feedback to the user
    } finally {
      setIsDownloading(false) // Reset loading state
    }
  }
  // --- END NEW HANDLER ---

  // --- Existing handlers remain unchanged ---
  const handleOpenFormModal = (stylist: IStylist | null = null) => {
    setEditingStylist(stylist)
    setIsFormModalOpen(true)
  }

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false)
    setEditingStylist(null)
  }

  const handleViewHistory = async (stylist: IStylist) => {
    setSelectedStylist(stylist)
    setIsHistoryModalOpen(true)
    setIsHistoryLoading(true)
    try {
      const res = await fetch(`/api/stylist-history?stylistId=${stylist._id}`)
      const data = await res.json()
      if (data.success) setHistoryData(data.data)
      else setHistoryData([])
    } catch (error) {
      console.error("Error fetching stylist history:", error)
      setHistoryData([])
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false)
    setSelectedStylist(null)
    setHistoryData([])
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this stylist?")) {
      try {
        const res = await fetch(`/api/stylists?id=${id}`, { method: "DELETE" })
        if (res.ok) fetchStylists()
        else console.error("Failed to delete stylist")
      } catch (error) {
        console.error("Error deleting stylist", error)
      }
    }
  }

  const handleSave = async (stylistData: any) => {
    const isEditing = !!editingStylist
    const url = isEditing ? `/api/stylists?id=${editingStylist!._id}` : "/api/stylists"
    const method = isEditing ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stylistData),
      })
      if (res.ok) {
        handleCloseFormModal()
        fetchStylists()
      } else {
        const errorData = await res.json()
        alert(`Failed to save: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Failed to save stylist", error)
      alert("An error occurred while saving.")
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
      {/* All modals rendered at the top level */}
      <StylistFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSave}
        stylistToEdit={editingStylist}
      />

      <StylistHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        stylistName={selectedStylist?.name || ""}
        history={historyData}
        isLoading={isHistoryLoading}
      />

      {/* --- RENDER THE NEW REPORT MODAL --- */}
      <ReportDownloadModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onDownload={handleDownloadReport}
        isDownloading={isDownloading}
      />
      {/* --- END NEW MODAL RENDER --- */}

      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-6 w-6 text-slate-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Stylist Management</h1>
              <p className="text-sm text-slate-500">Manage your team of professional stylists</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* --- NEW DOWNLOAD BUTTON --- */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors duration-150 shadow-sm border border-slate-300"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download Reports
            </button>
            {/* --- END NEW BUTTON --- */}

            {canCreate && (
              <button
                onClick={() => handleOpenFormModal()}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150 shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add New Stylist
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Body (no changes here) */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : stylists.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <UserGroupIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-2">No Stylists Found</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Get started by adding your first stylist to the team. You can manage their profiles, track their
              experience, and view their service history.
            </p>
            {canCreate && (
              <button
                onClick={() => handleOpenFormModal()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150"
              >
                <PlusIcon className="h-4 w-4" />
                Add First Stylist
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {stylists.map((stylist, index) => (
              <div
                key={String(stylist._id)}
                className="group bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {stylist.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">{stylist.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <span className="font-medium">#{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Experience</p>
                        <p className="font-medium text-slate-900">{stylist.experience} years</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="font-medium text-slate-900 text-sm">{stylist.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AcademicCapIcon className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Specialization</p>
                      <p className="font-medium text-slate-900 text-sm">{stylist.specialization}</p>
                    </div>
                  </div>
                </div>

                {(canUpdate || canDelete) && (
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleViewHistory(stylist)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors duration-150"
                        title="View History"
                      >
                        <ClockIcon className="h-3 w-3" />
                        <span>History</span>
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => handleOpenFormModal(stylist)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors duration-150"
                          title="Edit Stylist"
                        >
                          <PencilIcon className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(String(stylist._id))}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150"
                          title="Delete Stylist"
                        >
                          <TrashIcon className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}