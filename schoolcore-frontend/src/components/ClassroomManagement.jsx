import { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError, getFieldErrors } from "../utils/errorHandler";
import { formatDate, formatDateRange, formatWeekendDays } from "../utils/dateFormatter";
import Alert from "./Alert.jsx";
import ErrorDisplay from "./ErrorDisplay.jsx";
import "../styles/Management.css";

export default function ClassroomManagement({ classrooms, onRefresh, user, selectedYear, years, onYearChange }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", weekend_days: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle escape key to close modal
  const resetForm = () => {
    setForm({ name: "", start_date: "", end_date: "", weekend_days: [] });
    setEditingId(null);
    setShowForm(false);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showForm) {
        resetForm();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = {
        name: form.name,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        weekend_days: form.weekend_days || [],
        academic_year: selectedYear?.id
      };

      if (editingId) {
        await api.put(`classrooms/${editingId}/`, formData);
        setSuccess("Classroom updated successfully!");
      } else {
        await api.post("classrooms/", formData);
        setSuccess("Classroom created successfully!");
      }
      resetForm();
      onRefresh();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setError(fieldErrors);
      } else {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (classroom) => {
    setEditingId(classroom.id);
    setForm({
      name: classroom.name,
      start_date: classroom.start_date || "",
      end_date: classroom.end_date || "",
      weekend_days: classroom.weekend_days || []
    });
    setShowForm(true);
  };

  return (
    <div className="management-container">
      {error && (
        <ErrorDisplay
          error={error}
          type="error"
          onClose={() => setError("")}
        />
      )}
      {success && (
        <Alert
          message={success}
          type="success"
          onClose={() => setSuccess("")}
        />
      )}

      <div className="management-header">
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h2>Classroom Management</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          {showForm ? "Cancel" : "+ Add Classroom"}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Classroom" : "Add New Classroom"}</h3>
              <button className="modal-close-btn" onClick={() => resetForm()}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>School</label>
                <div style={{
                  padding: "10px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  color: "#333",
                  fontWeight: "500"
                }}>
                  {user?.school?.name || "Loading..."}
                </div>
              </div>
              <div className="form-group">
                <label>Classroom Name</label>
                <input
                  type="text"
                  placeholder="e.g., 10-A, 11-B"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Weekend Days</label>
                <div className="checkbox-group">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                    <label key={index} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.weekend_days?.includes(index) || false}
                        onChange={(e) => {
                          const days = form.weekend_days || [];
                          if (e.target.checked) {
                            setForm({ ...form, weekend_days: [...days, index].sort((a, b) => a - b) });
                          } else {
                            setForm({ ...form, weekend_days: days.filter(d => d !== index) });
                          }
                        }}
                        disabled={loading}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => resetForm()}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Weekend Days</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((classroom) => (
              <tr key={classroom.id}>
                <td>{classroom.name}</td>
                <td>{classroom.start_date ? formatDate(classroom.start_date) : "-"}</td>
                <td>{classroom.end_date ? formatDate(classroom.end_date) : "-"}</td>
                <td>{classroom.weekend_days ? formatWeekendDays(classroom.weekend_days) : "-"}</td>
                <td className="actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleEdit(classroom)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {classrooms.length === 0 && (
          <p className="no-data">No classrooms found. Create one to get started!</p>
        )}
      </div>
    </div>
  );
}
