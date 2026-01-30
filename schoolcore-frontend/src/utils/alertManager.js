/**
 * Centralized alert/notification management
 * Provides consistent notification handling across the application
 */

export const createAlert = (message, type = "info") => {
  return {
    id: Date.now(),
    message,
    type, // "success", "error", "warning", "info"
    timestamp: new Date(),
  };
};

export const getAlertIcon = (type) => {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠️",
    info: "ℹ️",
  };
  return icons[type] || "•";
};

export const isSuccessAlert = (alert) => alert.type === "success";
export const isErrorAlert = (alert) => alert.type === "error";
export const isWarningAlert = (alert) => alert.type === "warning";
