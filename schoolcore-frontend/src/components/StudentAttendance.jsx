import { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import Alert from "./Alert.jsx";

export default function StudentAttendance({ classroomId }) {
  const [form, setForm] = useState({
    month: "",
    year: "",
    working_days: "",
    present_days: ""
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!classroomId) return null;

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    // Validate inputs
    if (!form.month || !form.year || !form.working_days || !form.present_days) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, classroom_id: classroomId };
      const res = await api.post("attendance/", payload);
      setResult(res.data.attendance_percentage);
      setSuccess("Attendance recorded successfully!");
      setForm({ month: "", year: "", working_days: "", present_days: "" });
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      {error && (
        <Alert
          message={error}
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

      <h3>Monthly Attendance Entry</h3>
      <input
        type="number"
        min="1"
        max="12"
        placeholder="Month (1-12)"
        value={form.month}
        onChange={e => setForm({ ...form, month: e.target.value })}
        disabled={loading}
      />
      <input
        type="number"
        placeholder="Year"
        value={form.year}
        onChange={e => setForm({ ...form, year: e.target.value })}
        disabled={loading}
      />
      <input
        type="number"
        placeholder="Working Days"
        value={form.working_days}
        onChange={e => setForm({ ...form, working_days: e.target.value })}
        disabled={loading}
      />
      <input
        type="number"
        placeholder="Present Days"
        value={form.present_days}
        onChange={e => setForm({ ...form, present_days: e.target.value })}
        disabled={loading}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </button>
      {result !== null && <p>Attendance %: {result}</p>}
    </div>
  );
}
