"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

export interface InquiryFormData {
  headquarters: string
  programType: string
  firstName: string
  lastName: string
  email: string
  cellPhone: string
  homePhone: string
  dataAuthorization: boolean
}

interface InquiryFormProps {
  onSubmit: (data: InquiryFormData) => void
  onClose?: () => void
  isSubmitting?: boolean
  submissionError?: string | null
}

export function InquiryForm({
  onSubmit,
  onClose,
  isSubmitting = false,
  submissionError,
}: InquiryFormProps) {
  const [formData, setFormData] = useState<InquiryFormData>({
    headquarters: "",
    programType: "",
    firstName: "",
    lastName: "",
    email: "",
    cellPhone: "",
    homePhone: "",
    dataAuthorization: false,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof InquiryFormData, string>>>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Clear error when user starts typing
    if (errors[name as keyof InquiryFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof InquiryFormData, string>> = {}

    if (!formData.headquarters) {
      newErrors.headquarters = "Please select a campus"
    }
    if (!formData.programType) {
      newErrors.programType = "Please select a program type"
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.cellPhone.trim()) {
      newErrors.cellPhone = "Cell phone is required"
    }
    if (!formData.dataAuthorization) {
      newErrors.dataAuthorization = "You must authorize data processing"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="relative border-b border-gray-200 pb-6">
          <CardTitle className="text-3xl font-bold text-center">
            REQUEST <span className="text-[#9a1c14]">INFORMATION</span>
          </CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Fill out the form below and we'll get back to you soon
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close form"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </CardHeader>

        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campus Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campus / Location *
              </label>
              <select
                name="headquarters"
                value={formData.headquarters}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.headquarters ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
              >
                <option value="">Select a campus...</option>
                <option value="manila">Manila</option>
                <option value="makati">Makati</option>
                <option value="laguna">Laguna</option>
                <option value="online">Online</option>
              </select>
              {errors.headquarters && (
                <p className="text-red-500 text-sm mt-1">{errors.headquarters}</p>
              )}
            </div>

            {/* Program Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Program Type *
              </label>
              <select
                name="programType"
                value={formData.programType}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.programType ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
              >
                <option value="">Select a program type...</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="senior-high">Senior High School</option>
                <option value="online">Fully Online</option>
              </select>
              {errors.programType && (
                <p className="text-red-500 text-sm mt-1">{errors.programType}</p>
              )}
            </div>

            {/* Name Fields - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Juan"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Dela Cruz"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="juan.delacruz@example.com"
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone Numbers - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cell Phone *
                </label>
                <input
                  type="tel"
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.cellPhone ? "border-red-500" : "border-gray-300"
                  } focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors`}
                />
                {errors.cellPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.cellPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Home Phone <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="tel"
                  name="homePhone"
                  value={formData.homePhone}
                  onChange={handleChange}
                  placeholder="(02) 1234 5678"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-[#9a1c14] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Data Authorization */}
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="dataAuthorization"
                  checked={formData.dataAuthorization}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-[#9a1c14] border-gray-300 rounded focus:ring-[#9a1c14] cursor-pointer"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I authorize Mapúa University to verify the authenticity of the information provided and use it for
                  academic, administrative, and marketing purposes. I understand that my data will be processed in accordance with the{" "}
                  <a
                    href="#"
                    className="text-[#9a1c14] underline hover:text-[#7a1510] font-medium"
                  >
                    Mapúa Privacy Policy
                  </a>
                  . I have the right to request access, rectification, or deletion of my data at any time. *
                </span>
              </label>
              {errors.dataAuthorization && (
                <p className="text-red-500 text-sm mt-2 ml-8">
                  {errors.dataAuthorization}
                </p>
              )}
            </div>

            {/* Error Message */}
            {submissionError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 text-sm font-medium">
                    {submissionError}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full md:w-auto px-12 py-6 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#9a1c14] hover:bg-[#7a1510] text-white"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
