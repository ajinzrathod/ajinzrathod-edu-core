import React from "react";
import "../styles/ErrorDisplay.css";

/**
 * ErrorDisplay Component
 * Displays field-specific or general errors in a formatted manner
 * Supports both string errors and object errors with field names
 */
export default function ErrorDisplay({ error, type = "error", onClose }) {
  if (!error) return null;

  // Check if error is an object with field errors
  const isFieldError = typeof error === "object" && !Array.isArray(error);
  const displayError = isFieldError ? error : { general: error };

  return (
    <div className={`error-display error-display-${type}`} role="alert">
      <div className="error-display-content">
        <span className="error-display-icon">⚠️</span>
        <div className="error-display-message">
          {isFieldError ? (
            <div className="field-errors">
              {Object.entries(displayError).map(([field, message]) => (
                <div key={field} className="field-error-item">
                  <strong className="field-name">{field}:</strong>
                  <span className="field-error-text">
                    {Array.isArray(message) ? message[0] : message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="general-error">{error}</p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          className="error-display-close"
          onClick={onClose}
          aria-label="Close error"
        >
          ✕
        </button>
      )}
    </div>
  );
}
