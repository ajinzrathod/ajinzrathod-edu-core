import React from "react";
import { getAlertIcon } from "../utils/alertManager";

const alertStyles = {
  success: {
    bg: "bg-green-50",
    border: "border-l-4 border-green-600",
    text: "text-green-800",
    icon: "text-green-600",
    button: "text-green-600 hover:text-green-800"
  },
  error: {
    bg: "bg-red-50",
    border: "border-l-4 border-red-600",
    text: "text-red-800",
    icon: "text-red-600",
    button: "text-red-600 hover:text-red-800"
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-l-4 border-yellow-600",
    text: "text-yellow-800",
    icon: "text-yellow-600",
    button: "text-yellow-600 hover:text-yellow-800"
  },
  info: {
    bg: "bg-blue-50",
    border: "border-l-4 border-blue-600",
    text: "text-blue-800",
    icon: "text-blue-600",
    button: "text-blue-600 hover:text-blue-800"
  }
};

export default function Alert({ message, type = "info", onClose }) {
  const styles = alertStyles[type] || alertStyles.info;

  return (
    <div className={`${styles.bg} ${styles.border} p-4 rounded-md mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300 z-50 relative`} role="alert">
      <span className={`${styles.icon} text-lg font-bold flex-shrink-0`}>
        {getAlertIcon(type)}
      </span>
      <span className={`${styles.text} flex-1 text-sm font-medium`}>
        {message}
      </span>
      <button
        type="button"
        className={`${styles.button} text-lg leading-none font-bold flex-shrink-0 p-1 transition-colors`}
        onClick={onClose}
        aria-label={`Close ${type} alert`}
      >
        ✕
      </button>
    </div>
  );
}
