import React from "react";
import "../styles/Notification.css";

export default function Notification({ message, type = "info", onClose }) {
  return (
    <div className={`notification notification-${type}`}>
      <span className="notification-message">{message}</span>
      <button
        type="button"
        className="notification-close-btn"
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
