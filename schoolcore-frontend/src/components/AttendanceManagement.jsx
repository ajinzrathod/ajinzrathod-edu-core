import { useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import { formatDate } from "../utils/dateFormatter";
import "../styles/Management.css";
import Alert from "./Alert.jsx";
import Notification from "./Notification.jsx";

export default function AttendanceManagement({
  selectedYear,
  selectedClassroom,
  onClassroomChange,
  classrooms,
  years,
  onYearChange,
}) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [originalAttendance, setOriginalAttendance] = useState({}); // Track original state
  const [holidays, setHolidays] = useState([]);
  const [weekendDays, setWeekendDays] = useState([]); // Empty by default - will be fetched
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "synced", "not-synced", "syncing"
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedClassroom, setEditedClassroom] = useState(null);
  const studentsRef = useRef([]);  // Use ref to always access latest students

  useEffect(() => {
    if (selectedYear && selectedClassroom) {
      // Clear old data immediately to prevent stale UI flash
      setStudents([]);
      setAttendance({});
      // Set initial date to today's date if in range, else nearest valid date
      const today = new Date();
      const startDate = selectedClassroom?.start_date ? new Date(selectedClassroom.start_date) : null;
      const endDate = selectedClassroom?.end_date ? new Date(selectedClassroom.end_date) : null;
      let initialDate = today;
      if (startDate && endDate) {
        if (today < startDate) {
          initialDate = startDate;
        } else if (today > endDate) {
          initialDate = endDate;
        }
      } else if (startDate) {
        if (today < startDate) initialDate = startDate;
      } else if (endDate) {
        if (today > endDate) initialDate = endDate;
      }
      const formattedDate = initialDate.toISOString().split("T")[0];
      setSelectedDate(formattedDate);
      fetchStudents();
      fetchHolidays();
      fetchWeekends();
    } else {
      // Clear data when no classroom selected
      setStudents([]);
      setAttendance({});
    }
  }, [selectedYear, selectedClassroom]);

  // Fetch attendance when date changes (only after students are loaded)
  useEffect(() => {
    if (selectedYear && selectedClassroom && selectedDate && studentsRef.current.length > 0) {
      fetchAttendance();
    }
  }, [selectedDate, selectedYear, selectedClassroom]);

  // Fetch attendance after students are loaded (for initial/default date)
  useEffect(() => {
    if (selectedYear && selectedClassroom && selectedDate && students.length > 0) {
      fetchAttendance();
    }
  }, [students]);

  const fetchWeekends = useCallback(async () => {
    try {
      if (!selectedClassroom) return;

      // Get weekends from the classroom
      const response = await api.get(`classrooms/${selectedClassroom.id}/?t=${Date.now()}`);
      const classroom = response.data;

      if (classroom && classroom.weekend_days) {
        let weekends = classroom.weekend_days;

        // Parse JSON string if it comes as string
        if (typeof weekends === 'string') {
          try {
            weekends = JSON.parse(weekends);
          } catch (e) {
            console.warn("Could not parse weekend_days JSON:", weekends);
            weekends = [];
          }
        }

        // Ensure it's an array
        if (!Array.isArray(weekends)) {
          weekends = [];
        }

        console.log("✓ Fetched weekends for classroom:", weekends);
        setWeekendDays(weekends);
      } else {
        setWeekendDays([]);
      }
    } catch (err) {
      console.error("Error fetching weekend configuration:", err);
      setWeekendDays([]);
    }
  }, [selectedClassroom]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `classrooms/${selectedClassroom.id}/students/`,
        {
          params: { year_id: selectedYear?.id },
        }
      );
      const studentsData = Array.isArray(response.data) ? response.data : [];
      setStudents(studentsData);
      studentsRef.current = studentsData;  // Update ref
      // Initialize attendance object with null (not yet marked)
      const initAttendance = {};
      studentsData.forEach((student) => {
        initAttendance[student.id] = null;
      });
      setAttendance(initAttendance);
    } catch (err) {
      console.error("Error fetching students:", err);
      setNotification({ message: "Error fetching students", type: "error" });
      setStudents([]);
      studentsRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [selectedClassroom, selectedYear]);

  const fetchHolidays = useCallback(async () => {
    try {
      const response = await api.get("holidays/", {
        params: { year_id: selectedYear?.id },
      });
      const holidaysData = Array.isArray(response.data) ? response.data : [];
      setHolidays(holidaysData);
    } catch (err) {
      console.error("Error fetching holidays:", err);
      setHolidays([]);
    }
  }, [selectedYear]);

  const fetchAttendance = useCallback(async () => {
    try {
      setFetching(true);
      const response = await api.get(
        `classrooms/${selectedClassroom.id}/attendance/`,
        {
          params: {
            year_id: selectedYear?.id,
            date: selectedDate, // Filter by specific date on backend
          },
        }
      );

      const attendanceMap = {};

      // Handle both direct array and paginated response formats
      let attendanceData = [];
      if (Array.isArray(response.data)) {
        attendanceData = response.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        attendanceData = response.data.results;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        attendanceData = response.data.data;
      }

      // Initialize all students as null (not yet marked) - use ref to get latest students
      const currentStudents = studentsRef.current;
      if (currentStudents && currentStudents.length > 0) {
        currentStudents.forEach((student) => {
          attendanceMap[student.id] = null;
        });
      }

      // Update with actual attendance records (already filtered by date on backend)
      attendanceData.forEach((record) => {
        if (record.student) {
          attendanceMap[record.student] = record.present;
        }
      });
      setAttendance(attendanceMap);
      setOriginalAttendance({...attendanceMap}); // Save original state for comparison
      setSyncStatus(""); // Clear sync status when data is freshly fetched
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setFetching(false);
    }
  }, [selectedClassroom, selectedYear, selectedDate]);

  const isDateMarkable = () => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();

    // Check if date is a weekend for this academic year
    if (weekendDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if holiday
    const isHoliday = holidays.some(h => h.date === selectedDate);
    return !isHoliday;
  };

  const getDateStatus = () => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Check if it's a weekend for this academic year
    if (weekendDays.includes(dayOfWeek)) {
      return `${dayNames[dayOfWeek]} - No Classes`;
    }

    const holiday = holidays.find(h => h.date === selectedDate);
    if (holiday) return `Holiday - ${holiday.name}`;

    return "School Day";
  };

  const handleAttendanceChange = (studentId) => {
    // Don't allow marking on holidays or Sunday
    if (!isDateMarkable()) {
      alert("Cannot mark attendance on holidays or Sunday");
      return;
    }

    // Cycle through: null (not marked) -> true (present) -> false (absent) -> null
    const current = attendance[studentId];
    let next;
    if (current === null) next = true; // null -> present
    else if (current === true) next = false; // present -> absent
    else next = null; // absent -> not marked

    setAttendance({
      ...attendance,
      [studentId]: next,
    });
    setSyncStatus("not-synced"); // Mark as unsaved
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setSyncStatus("syncing");

    try {
      // Prepare bulk attendance records (only changed ones)
      const attendanceRecords = students
        .map((student) => ({
          student_id: student.id,
          date: selectedDate,
          present: attendance[student.id],
          year_id: selectedYear.id,
        }))
        .filter(record => record.present !== null); // Only send marked records

      // Send all records in a single bulk request
      const response = await api.post("attendance/create/", {
        attendance: attendanceRecords
      });

      setOriginalAttendance({...attendance}); // Update original state after successful save
      setSyncStatus("synced");
      setNotification({ message: `Attendance saved successfully! (${attendanceRecords.length} records)`, type: "success" });
    } catch (err) {
      setSyncStatus("not-synced");

      // Extract error message - prioritize specific error arrays from backend
      let errorMsg = "Error saving attendance";

      if (err.response?.data?.errors) {
        // If backend returns array of errors
        const errors = err.response.data.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          errorMsg = errors[0]; // Show first error
        }
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }

      setNotification({ message: errorMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPresent = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.id] = true;
    });
    setAttendance(newAttendance);
    setSyncStatus("not-synced");
  };

  const handleBulkAbsent = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.id] = false;
    });
    setAttendance(newAttendance);
    setSyncStatus("not-synced");
  };

  const handleBulkReset = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.id] = null;
    });
    setAttendance(newAttendance);
    setSyncStatus("not-synced");
  };

  return (
    <div className="management-container">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="management-header">
        <div>
          <h2>Mark Attendance</h2>
        </div>
      </div>

      {classrooms.length > 0 && (
        <div className="filter-section">
          <label>Select Classroom:</label>
          <select
            value={selectedClassroom?.id || ""}
            onChange={(e) => {
              if (e.target.value === "") {
                onClassroomChange(null);
              } else {
                const classroom = classrooms.find(
                  (c) => c.id === parseInt(e.target.value)
                );
                onClassroomChange(classroom);
              }
            }}
          >
            <option value="">-- Select a Classroom --</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
          {selectedClassroom && selectedYear && selectedClassroom.start_date && selectedClassroom.end_date && (
            <div style={{ marginTop: 12 }}>
              <span role="img" aria-label="calendar">📅</span> Academic Year: <strong>{selectedYear.year}</strong> ({formatDate(selectedClassroom.start_date)} to {formatDate(selectedClassroom.end_date)})
            </div>
          )}
        </div>
      )}

      {selectedClassroom && (
        <div className="attendance-controls">
          <div className="date-picker">
            <label>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={selectedClassroom?.start_date}
              max={new Date().toISOString().split("T")[0]}
              disabled={!selectedClassroom}
            />
            <span className={`date-status ${isDateMarkable() ? "school-day" : "no-school"}`}>
              {getDateStatus()}
            </span>
            {fetching && <span className="fetching-indicator">Fetching...</span>}
          </div>

          <div className="bulk-actions">
            <button
              className="btn-secondary btn-mark-present"
              onClick={handleBulkPresent}
              disabled={!isDateMarkable() || fetching}
            >
              Mark All Present
            </button>
            <button
              className="btn-secondary btn-mark-absent"
              onClick={handleBulkAbsent}
              disabled={!isDateMarkable() || fetching}
            >
              Mark All Absent
            </button>
            <button
              className="btn-secondary btn-reset-all"
              onClick={handleBulkReset}
              disabled={fetching}
            >
              Reset All
            </button>
            <div className="save-button-wrapper">
              <button
                className="btn-primary btn-save"
                onClick={handleSaveAttendance}
                disabled={saving || loading || !isDateMarkable() || fetching}
                title={syncStatus === "not-synced" ? "Click to save changes" : ""}
              >
                {saving ? "⏳ Saving..." : "💾 Save Attendance"}
              </button>
              {syncStatus === "not-synced" && (
                <span className="sync-badge not-synced" title="Unsaved changes">●</span>
              )}
              {syncStatus === "synced" && (
                <span className="sync-badge success" title="All synced">✓</span>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="attendance-grid">
        {loading || fetching ? (
          <p className="loading-message">{fetching ? "📥 Fetching attendance data..." : "Loading students..."}</p>
        ) : !isDateMarkable() ? (
          <div className="no-marking-message">
            <p>🗓️ {getDateStatus()}</p>
            <p>Attendance cannot be marked on this date</p>
          </div>
        ) : !selectedClassroom ? (
          <p className="no-data">Please select a classroom to view students.</p>
        ) : students.length === 0 ? (
          <p className="no-data">No students found in this classroom.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Enrollment #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.user_full_name}</td>
                  <td>{student.enrollment_number}</td>
                  <td className="attendance-toggle">
                    <button
                      className={`toggle-btn ${
                        attendance[student.id] === true
                          ? "present"
                          : attendance[student.id] === false
                          ? "absent"
                          : "pending"
                      }`}
                      onClick={() =>
                        handleAttendanceChange(student.id)
                      }
                      disabled={fetching}
                    >
                      {attendance[student.id] === true
                        ? "✓ Present"
                        : attendance[student.id] === false
                        ? "✗ Absent"
                        : "? Not Yet Marked"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
