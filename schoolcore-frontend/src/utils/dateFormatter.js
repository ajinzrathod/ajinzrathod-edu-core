/**
 * Date Formatter Utility
 * Formats dates consistently across the UI
 * Format: "January 10, 2025" or "February 05, 2026"
 */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Format a date string or Date object to "Month DD, YYYY" format
 * @param {string|Date} dateInput - Date to format (YYYY-MM-DD or Date object)
 * @returns {string} Formatted date string (e.g., "January 10, 2025")
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return "";

  let date;
  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return "";
  }

  if (isNaN(date.getTime())) return "";

  const month = monthNames[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
};

/**
 * Format a date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Formatted range (e.g., "January 10, 2025 - February 05, 2026")
 */
export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (!start || !end) return "";
  return `${start} - ${end}`;
};

/**
 * Get relative date string (Today, Yesterday, Tomorrow, or formatted date)
 * @param {string|Date} dateInput - Date to format
 * @returns {string} Relative date or formatted date
 */
export const getRelativeDate = (dateInput) => {
  if (!dateInput) return "";

  let date;
  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return "";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const diffTime = checkDate - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return formatDate(dateInput);
};

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string|Date} dateInput - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForInput = (dateInput) => {
  if (!dateInput) return "";

  let date;
  if (typeof dateInput === "string") {
    // If already in correct format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return "";
  }

  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Format time from a date
 * @param {string|Date} dateInput - Date with time
 * @returns {string} Formatted time (e.g., "10:30 AM")
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return "";

  let date;
  if (typeof dateInput === "string") {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return "";
  }

  if (isNaN(date.getTime())) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

/**
 * Format date and time together
 * @param {string|Date} dateInput - Date to format
 * @returns {string} Formatted date and time (e.g., "January 10, 2025 10:30")
 */
export const formatDateTime = (dateInput) => {
  const date = formatDate(dateInput);
  const time = formatTime(dateInput);

  if (!date || !time) return formatDate(dateInput);
  return `${date} ${time}`;
};

/**
 * Convert numeric day codes to day names
 * @param {number[]|string} dayCodesInput - Array of numeric day codes (0-6) or comma-separated string
 * @returns {string} Comma-separated day names (e.g., "Saturday, Sunday")
 */
export const formatWeekendDays = (dayCodesInput) => {
  if (!dayCodesInput) return "";

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  let dayCodes = [];

  if (typeof dayCodesInput === "string") {
    // If string, parse as comma-separated numbers
    dayCodes = dayCodesInput.split(",").map(d => parseInt(d.trim())).filter(d => !isNaN(d));
  } else if (Array.isArray(dayCodesInput)) {
    dayCodes = dayCodesInput;
  } else {
    return "";
  }

  if (dayCodes.length === 0) return "";

  const dayNamesList = dayCodes
    .filter(code => code >= 0 && code <= 6)
    .map(code => dayNames[code]);

  return dayNamesList.join(", ");
};

export default {
  formatDate,
  formatDateRange,
  getRelativeDate,
  formatDateForInput,
  formatTime,
  formatDateTime,
  formatWeekendDays,
};
