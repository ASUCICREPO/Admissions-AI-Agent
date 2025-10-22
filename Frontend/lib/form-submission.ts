import type { InquiryFormData } from "@/components/inquiry-form";
import { config } from "@/lib/config";

interface FormSubmissionResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Submit form lead to backend API (Salesforce)
 */
export async function submitFormLead(
  formData: InquiryFormData
): Promise<FormSubmissionResponse> {
  try {
    if (!config.formSubmissionApi) {
      throw new Error(
        "Form submission endpoint is not configured. Set NEXT_PUBLIC_FORM_SUBMISSION_API."
      );
    }

    // Prepare the payload to match the expected format from the backend
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      cellPhone: formData.cellPhone,
      headquarters: formData.headquarters,
      programType: formData.programType,
      homePhone: formData.homePhone || "",
      dataAuthorization: formData.dataAuthorization,
    };

    console.log("[Form Submission] Submitting form data to API:", payload);

    const response = await fetch(`${config.formSubmissionApi}createFormLead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[Form Submission] HTTP error:",
        response.status,
        errorText
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("[Form Submission] Success:", responseData);

    return {
      success: true,
      message: "Form submitted successfully",
      data: responseData,
    };
  } catch (error) {
    console.error("[Form Submission] Error submitting form:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
    };
  }
}
