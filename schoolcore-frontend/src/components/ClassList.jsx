import { useEffect, useState } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";

export default function ClassList({ onSelectClass }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("classrooms/");
        setClasses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (loading) return <div><p>Loading classrooms...</p></div>;
  if (error) return <div><p style={{ color: "red" }}>Error: {error}</p></div>;

  return (
    <div>
      <h3>Select Class</h3>
      {classes.length === 0 ? (
        <p>No classrooms available</p>
      ) : (
        <select onChange={e => onSelectClass(e.target.value)}>
          <option value="">--Select--</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
