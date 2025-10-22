"use client"

import { useState } from "react"
import { MapuaLandingPage } from "@/components/mapua-landing-page"
import { InquiryForm, type InquiryFormData } from "@/components/inquiry-form"
import { NemoChatInterface, type FormContext } from "@/components/nemo/nemo-chat-interface"
import { submitFormLead } from "@/lib/form-submission"

type AppState = "landing" | "form" | "chat"

export default function Home() {
  // State machine
  const [currentState, setCurrentState] = useState<AppState>("landing")
  const [formData, setFormData] = useState<InquiryFormData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  /**
   * Handle "Inquire Now" button click from landing page
   */
  const handleInquireNow = () => {
    setCurrentState("form")
  }

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: InquiryFormData) => {
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // Submit form data to the API
      const result = await submitFormLead(data)

      if (result.success) {
        console.log("[App] Form submitted successfully:", result.data)
        // Store form data for chatbot context
        setFormData(data)
        // Transition directly to chat (skip success screen)
        setCurrentState("chat")
      } else {
        // Handle API error
        setSubmissionError(
          result.message || "Failed to submit form. Please try again."
        )
        console.error("[App] Form submission failed:", result.message)
      }
    } catch (error) {
      setSubmissionError("An unexpected error occurred. Please try again.")
      console.error("[App] Unexpected error during form submission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle close/return to landing
   */
  const handleReturnToLanding = () => {
    setCurrentState("landing")
    setFormData(null)
    setSubmissionError(null)
  }

  /**
   * Convert form data to chatbot context
   */
  const getFormContext = (): FormContext | undefined => {
    if (!formData) return undefined

    return {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      cellPhone: formData.cellPhone,
      homePhone: formData.homePhone,
      headquarters: formData.headquarters,
      programType: formData.programType,
    }
  }

  return (
    <>
      {/* Landing Page State */}
      {currentState === "landing" && (
        <MapuaLandingPage onInquireNow={handleInquireNow} />
      )}

      {/* Form State */}
      {currentState === "form" && (
        <InquiryForm
          onSubmit={handleFormSubmit}
          onClose={handleReturnToLanding}
          isSubmitting={isSubmitting}
          submissionError={submissionError}
        />
      )}

      {/* Chat State */}
      {currentState === "chat" && (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
          <NemoChatInterface
            onClose={handleReturnToLanding}
            initialContext={getFormContext()}
          />
        </div>
      )}
    </>
  )
}
