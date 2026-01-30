import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { handleApiError, getFieldErrors } from "../utils/errorHandler";
import Alert from "./Alert.jsx";
import ErrorDisplay from "./ErrorDisplay.jsx";
import "../styles/Management.css";

export default function StudentManagement({
  selectedYear,
  selectedClassroom,
  onClassroomChange,
  classrooms,
  onRefresh,
  years,
  onYearChange,
}) {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState("search"); // "search" | "select" | "create"
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    roll_number: "",
    classroom: "",
  });

  // Restore classroom and year from location state when coming back from student details
  useEffect(() => {
    const classroomId =
      location.state?.classroomId ||
      parseInt(localStorage.getItem("selectedClassroomId"));
    const yearId =
      location.state?.yearId ||
      parseInt(localStorage.getItem("selectedYearId"));

    if (classroomId && yearId) {
      const classroom = classrooms.find((c) => c.id === classroomId);
      const year = years.find((y) => y.id === yearId);

      if (year && selectedYear?.id !== yearId) {
        onYearChange(year);
      }
      if (classroom && selectedClassroom?.id !== classroomId) {
        onClassroomChange(classroom);
      }
    }
  }, [location.state, classrooms, years]);

  useEffect(() => {
    if (selectedYear && selectedClassroom) {
      setStudents([]);
      setError("");
      // Persist selections to localStorage
      localStorage.setItem("selectedClassroomId", selectedClassroom.id);
      localStorage.setItem("selectedYearId", selectedYear.id);
      fetchStudents();
    } else {
      // Clear students when no classroom selected
      setStudents([]);
    }
  }, [selectedYear, selectedClassroom]);

  // Handle escape key to close modal
  const resetForm = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      roll_number: "",
      classroom: "",
    });
    setEditingId(null);
    setShowForm(false);
    setFormStep("search");
    setSearchResults([]);
    setSelectedUser(null);
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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `classrooms/${selectedClassroom.id}/students/`,
        {
          params: { year_id: selectedYear?.id },
        }
      );
      const studentsData = Array.isArray(response.data) ? response.data : [];
      setStudents(studentsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.get("users/search/", {
        params: {
          first_name: form.first_name,
          last_name: form.last_name,
        },
      });

      setSearchResults(response.data.users);
      if (response.data.users.length > 0) {
        setFormStep("select");
      } else {
        setFormStep("create");
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setForm((prev) => ({
      ...prev,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    }));
    setFormStep("create");
  };

  const handleCreateNewUser = () => {
    setSelectedUser(null);
    setFormStep("create");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        roll_number: parseInt(form.roll_number),
        classroom: form.classroom || selectedClassroom.id,
      };

      if (selectedUser) {
        payload.user_id = selectedUser.id;
      } else {
        payload.first_name = form.first_name;
        payload.last_name = form.last_name;
        payload.email = form.email;
      }

      if (editingId) {
        await api.put(`students/${editingId}/`, payload);
        setSuccess("Student updated successfully!");
      } else {
        await api.post("students/create/", payload);
        setSuccess("Student created successfully!");
      }

      resetForm();
      fetchStudents();
      onRefresh();
    } catch (err) {
      // Try to get field-specific errors first
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setError(fieldErrors);
      } else {
        // Fall back to general error message
        const errorMessage = handleApiError(err);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setForm({
      first_name: student.user_full_name.split(" ")[0],
      last_name: student.user_full_name.split(" ").slice(1).join(" ") || "",
      email: student.user_email || "",
      roll_number: student.roll_number,
      classroom: student.classroom,
    });
    setFormStep("create");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?"))
      return;

    try {
      await api.delete(`students/${id}/`);
      setSuccess("Student deleted successfully!");
      fetchStudents();
      onRefresh();
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    }
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
        <div>
          <h2>Student Management</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          {showForm ? "Cancel" : "+ Add Student"}
        </button>
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
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingId
                  ? "Edit Student"
                  : formStep === "search"
                  ? "Search for Student"
                  : formStep === "select"
                  ? "Select User"
                  : "Student Details"}
              </h3>
              <button className="modal-close-btn" onClick={() => resetForm()}>
                ✕
              </button>
            </div>

            {/* Step 1: Search */}
            {formStep === "search" && !editingId && (
              <form onSubmit={handleSearchUser}>
                <div className="form-info">
                  <p>
                    Search for an existing user first. If found, we will
                    reuse their profile. If not, we will create a new one.
                  </p>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      First Name <span className="permanent-badge">Permanent</span>
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) =>
                        setForm({ ...form, first_name: e.target.value })
                      }
                      placeholder="e.g., Ajinkya"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Last Name <span className="permanent-badge">Permanent</span>
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) =>
                        setForm({ ...form, last_name: e.target.value })
                      }
                      placeholder="e.g., Rathod"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Searching..." : "Search User"}
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
            )}

            {/* Step 2: Select User */}
            {formStep === "select" && !editingId && (
              <div>
                <div className="form-info">
                  <p>Found {searchResults.length} user(s). Select one or create new:</p>
                </div>

                <div className="user-list">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="user-card"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="user-card-header">
                        <strong>
                          {user.first_name} {user.last_name}
                        </strong>
                        <span className="user-id-badge">ID: {user.id}</span>
                      </div>
                      <div className="user-card-details">
                        <p>
                          <small>Username: {user.username}</small>
                        </p>
                        <p>
                          <small>Email: {user.email}</small>
                        </p>
                        {user.enrollment_history && user.enrollment_history.length > 0 && (
                          <div className="enrollment-history">
                            <small>
                              <strong>Enrollment History:</strong>
                            </small>
                            <ul>
                              {user.enrollment_history.map((enroll, idx) => (
                                <li key={idx}>
                                  <small>
                                    {enroll.year} - {enroll.classroom} (Roll{" "}
                                    {enroll.roll_number})
                                  </small>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-info"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user);
                        }}
                      >
                        Use This User
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                  <p>
                    <strong>Or create a new user:</strong>
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCreateNewUser}
                  >
                    Create New User
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Create/Edit Student */}
            {formStep === "create" && (
              <form onSubmit={handleSubmit}>
                {selectedUser && (
                  <div className="existing-user-info">
                    <p>
                      <strong>Using existing user:</strong> {selectedUser.first_name}{" "}
                      {selectedUser.last_name}
                    </p>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setSelectedUser(null);
                        setFormStep("search");
                      }}
                    >
                      Change user
                    </button>
                  </div>
                )}

                {!selectedUser && !editingId && (
                  <>
                    <div className="section-header">
                      <h4>Permanent Details (Same across all years)</h4>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          First Name{" "}
                          <span className="permanent-badge">Permanent</span>
                        </label>
                        <input
                          type="text"
                          value={form.first_name}
                          onChange={(e) =>
                            setForm({ ...form, first_name: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Last Name{" "}
                          <span className="permanent-badge">Permanent</span>
                        </label>
                        <input
                          type="text"
                          value={form.last_name}
                          onChange={(e) =>
                            setForm({ ...form, last_name: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        Email{" "}
                        <span className="permanent-badge">Permanent</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                <div className="section-header">
                  <h4>Year-Specific Details ({selectedYear?.year})</h4>
                </div>

                <div className="form-group">
                  <label>
                    Roll Number <span className="year-badge">This Year</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g., 1, 2, 3..."
                    value={form.roll_number}
                    onChange={(e) =>
                      setForm({ ...form, roll_number: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                  <small>Sequential number within {selectedClassroom?.name} (1-100)</small>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Student"}
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
            )}
          </div>
        </div>
      )}

      <div className="table-container">

        {loading ? (
          <p className="loading-message">Loading students...</p>
        ) : !selectedClassroom ? (
          <p className="no-data">Please select a classroom to view students.</p>
        ) : students.length === 0 ? (
          <p className="no-data">No students found in this classroom.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll No.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.user_full_name}</td>
                  <td className="roll-number">{student.roll_number}</td>
                  <td className="actions">
                    <button
                      className="btn-info"
                      onClick={() => navigate(`/students/${student.id}`, {
                        state: { classroomId: selectedClassroom.id, yearId: selectedYear?.id }
                      })}
                      title="View detailed attendance & report"
                    >
                      👁️ Details
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleEdit(student)}
                      title="Edit student info"
                    >
                      ✏️ Edit
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

