"use client"

import type React from "react"

import type { IStylist } from "@/models/Stylist"
import { useState, useEffect, type FormEvent } from "react"
import { XMarkIcon, UserIcon, PhoneIcon, AcademicCapIcon, ClockIcon } from "@heroicons/react/24/outline"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (stylist: Omit<IStylist, "_id" | "createdAt" | "updatedAt">) => void
  stylistToEdit: IStylist | null
}

export default function StylistFormModal({ isOpen, onClose, onSave, stylistToEdit }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    experience: "",
    specialization: "",
    phone: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (stylistToEdit) {
        setFormData({
          name: stylistToEdit.name,
          experience: stylistToEdit.experience.toString(),
          specialization: stylistToEdit.specialization,
          phone: stylistToEdit.phone,
        })
      } else {
        setFormData({
          name: "",
          experience: "",
          specialization: "",
          phone: "",
        })
      }
      setErrors({})
    }
  }, [stylistToEdit, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.experience.trim()) {
      newErrors.experience = "Experience is required"
    } else if (Number.parseInt(formData.experience, 10) < 0) {
      newErrors.experience = "Experience must be a positive number"
    }

    if (!formData.specialization.trim()) {
      newErrors.specialization = "Specialization is required"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSave({
      name: formData.name.trim(),
      experience: Number.parseInt(formData.experience, 10),
      specialization: formData.specialization.trim(),
      phone: formData.phone.trim(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {stylistToEdit ? "Edit Stylist" : "Add New Stylist"}
              </h2>
              <p className="text-sm text-slate-500">
                {stylistToEdit ? "Update stylist information" : "Create a new stylist profile"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors duration-150">
            <XMarkIcon className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                    Full Name
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ${
                    errors.name ? "border-red-300 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Enter stylist's full name"
                  autoFocus
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Experience Field */}
              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-slate-500" />
                    Experience (Years)
                  </div>
                </label>
                <input
                  type="number"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ${
                    errors.experience ? "border-red-300 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="0"
                />
                {errors.experience && <p className="mt-1 text-sm text-red-600">{errors.experience}</p>}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-slate-500" />
                    Phone Number
                  </div>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ${
                    errors.phone ? "border-red-300 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Specialization Field */}
              <div className="md:col-span-2">
                <label htmlFor="specialization" className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className="h-4 w-4 text-slate-500" />
                    Specialization
                  </div>
                </label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ${
                    errors.specialization ? "border-red-300 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="e.g., Hair Cutting, Hair Coloring, Makeup"
                />
                {errors.specialization && <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>}
              </div>
            </div>

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
                {stylistToEdit ? "Update Stylist" : "Create Stylist"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
