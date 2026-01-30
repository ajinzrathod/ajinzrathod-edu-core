import { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError, getFieldErrors } from "../utils/errorHandler";
import { formatDate } from "../utils/dateFormatter";
import Alert from "./Alert.jsx";
import ErrorDisplay from "./ErrorDisplay.jsx";
import "../styles/Management.css";

export default function HolidayManagement({ selectedYear, years, onYearChange }) {
  const [holidays, setHolidays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    date: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (selectedYear) {
      setHolidays([]);
      setError("");
      fetchHolidays();
    }
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("holidays/", {
        params: { year_id: selectedYear?.id },
      });
      const holidaysData = Array.isArray(response.data) ? response.data : [];
      setHolidays(holidaysData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        date: form.date,
        name: form.name,
        year: selectedYear.id,
      };

      if (editingId) {
        await api.put(`holidays/${editingId}/`, payload);
        setSuccess("Holiday updated successfully!");
      } else {
        await api.post("holidays/", payload);
        setSuccess("Holiday created successfully!");
      }

      resetForm();
      fetchHolidays();
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

  const handleEdit = (holiday) => {
    setEditingId(holiday.id);
    setForm({
      date: holiday.date,
      name: holiday.name || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;

    try {
      await api.delete(`holidays/${id}/`);
      setSuccess("Holiday deleted successfully!");
      fetchHolidays();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setError(fieldErrors);
      } else {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setForm({ date: "", name: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

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
      <div className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Holiday Management</h2>
          {selectedYear && (
            <p className="subtitle">
              Year: <strong>{selectedYear.year}</strong>
            </p>
          )}
        </div>
        <div>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Holiday"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit Holiday" : "Add New Holiday"}</h3>
              <button className="modal-close-btn" onClick={() => resetForm()}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g., Republic Day, Diwali"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save Holiday"}
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
              <th>Date</th>
              <th>Holiday Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedHolidays.map((holiday) => (
              <tr key={holiday.id}>
                <td>{formatDate(holiday.date)}</td>
                <td>{holiday.name || "Holiday"}</td>
                <td className="actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleEdit(holiday)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(holiday.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {holidays.length === 0 && (
          <p className="no-data">No holidays defined for this year.</p>
        )}
      </div>
    </div>
  );
}
