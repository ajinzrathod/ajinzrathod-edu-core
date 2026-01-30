
/**
 * Centralized error handling utility
 * Provides consistent error messages across the application
 */

export const getErrorMessage = (error) => {
  // Handle network errors
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please check your internet connection.";
    }
    if (error.message === "Network Error") {
      return "Unable to connect to the server. Please check your internet connection.";
    }
    return "An unexpected error occurred. Please try again.";
  }

  // Handle specific HTTP status codes
  const status = error.response?.status;
  const data = error.response?.data;

  switch (status) {
    case 400:
      return getValidationError(data);
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      // Handle device verification errors specifically
      if (data?.error === "Device not verified") {
        return data?.message || "Your device has not been verified. Please contact your administrator.";
      }
      return data?.message || "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This resource already exists. Please use a different name or value.";
    case 500:
      return "Server error. Please try again later.";
    case 503:
      return "Server is temporarily unavailable. Please try again later.";
    default:
      return data?.detail || data?.message || "Something went wrong. Please try again.";
  }
};

const getValidationError = (data) => {
  if (!data) return "Invalid input. Please check your data.";

  // Check for non_field_errors first
  if (data.non_field_errors) {
    const message = Array.isArray(data.non_field_errors)
      ? data.non_field_errors[0]
      : data.non_field_errors;
    return message;
  }

  // Handle field-specific errors - return as formatted JSON-like string
  const errorFields = [
    "roll_number",
    "enrollment_number",
    "name",
    "date",
    "start_date",
    "end_date",
    "username",
    "email",
    "password",
    "user",
    "user_id",
    "classroom",
    "first_name",
    "last_name",
  ];

  for (const field of errorFields) {
    if (data[field]) {
      const message = Array.isArray(data[field])
        ? data[field][0]
        : data[field];
      // Return field name and message in a readable format
      return `${field}: ${message}`;
    }
  }

  return data.detail || "Invalid input. Please check your data.";
};

export const handleApiError = (error, customFallback = null) => {
  console.error("API Error:", error);
  return customFallback || getErrorMessage(error);
};

/**
 * Extract field-specific errors from API response
 * Returns object like { roll_number: "Roll number 1 already exists in Class 1" }
 */
export const getFieldErrors = (error) => {
  const fieldErrors = {};

  if (!error.response?.data) return fieldErrors;

  const data = error.response.data;

  // Extract all field errors
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'detail' && key !== 'message' && key !== 'non_field_errors') {
      fieldErrors[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  return fieldErrors;
};

export const validateForm = (form, requiredFields) => {
  const errors = {};
  requiredFields.forEach((field) => {
    if (!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
      errors[field] = `${field.replace(/_/g, " ")} is required`;
    }
  });

  return errors;
};

export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
