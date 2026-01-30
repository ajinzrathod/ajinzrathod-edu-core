import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import Alert from "./Alert.jsx";
import "../styles/AuditLogs.css";

export default function AuditLogs({ user }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchAuditLogs(1);
  }, [modelFilter, actionFilter, pageSize]);

  useEffect(() => {
    fetchAuditLogs(currentPage);
  }, [currentPage]);

  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: page,
        page_size: pageSize,
      };
      if (modelFilter) params.model = modelFilter;
      if (actionFilter) params.action = actionFilter;

      const response = await api.get("audit-logs/", { params });
      setAuditLogs(response.data.results);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const colors = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatChanges = (changes, truncate = true) => {
    if (!changes || Object.keys(changes).length === 0) {
      return "No changes";
    }

    const entries = Object.entries(changes).map(([field, change]) => {
      const oldValue = change.old === null ? "N/A" : change.old;
      const newValue = change.new === null ? "N/A" : change.new;
      return `${field}: ${oldValue} → ${newValue}`;
    });

    const fullText = entries.join("; ");
    if (truncate && fullText.length > 50) {
      return fullText.substring(0, 50) + "...";
    }
    return fullText;
  };

  const toggleExpand = (logId) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="audit-logs-container">
      <h2>Audit Logs</h2>

      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      <div className="audit-filters">
        <div className="filter-group">
          <label htmlFor="model-filter">Model:</label>
          <select
            id="model-filter"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
          >
            <option value="">All Models</option>
            <option value="User">User</option>
            <option value="ClassRoom">Classroom</option>
            <option value="Student">Student</option>
            <option value="Attendance">Attendance</option>
            <option value="Holiday">Holiday</option>
            <option value="AcademicYear">Academic Year</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="action-filter">Action:</label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : auditLogs.length === 0 ? (
        <div className="no-data">No audit logs found</div>
      ) : (
        <div className="audit-logs-list">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Model</th>
                <th>Object</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="audit-row">
                    <td className="expand-btn">
                      <button
                        className="expand-icon"
                        onClick={() => toggleExpand(log.id)}
                        title={expandedLogId === log.id ? "Collapse" : "Expand"}
                      >
                        {expandedLogId === log.id ? "▼" : "▶"}
                      </button>
                    </td>
                    <td className="timestamp">{formatTimestamp(log.timestamp)}</td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="performed-by">{log.performed_by_name}</td>
                    <td className="model-name">{log.model_name}</td>
                    <td className="object-display">{log.object_display}</td>
                    <td className="changes" title={formatChanges(log.changes, false)}>
                      {formatChanges(log.changes, true)}
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr className="expand-row">
                      <td colSpan="7">
                        <div className="changes-details">
                          <h4>Changes</h4>
                          {Object.entries(log.changes).length === 0 ? (
                            <p>No changes recorded</p>
                          ) : (
                            <div className="changes-list">
                              {Object.entries(log.changes).map(([field, change]) => (
                                <div key={field} className="change-item">
                                  <span className="field-name">{field}:</span>
                                  <span className="new-value">
                                    {change.new === null ? (
                                      <span className="null-value">N/A</span>
                                    ) : (
                                      String(change.new)
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditLogs.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_count} total records)
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="page-size-select"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={!pagination.has_previous}
              className="pagination-btn"
              title="First page"
            >
              ⟨⟨
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.has_previous}
              className="pagination-btn"
              title="Previous page"
            >
              ⟨
            </button>

            <span className="page-input-group">
              Page{" "}
              <input
                type="number"
                min="1"
                max={pagination.total_pages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= pagination.total_pages) {
                    setCurrentPage(page);
                  }
                }}
                className="page-input"
              />
              of {pagination.total_pages}
            </span>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.has_next}
              className="pagination-btn"
              title="Next page"
            >
              ⟩
            </button>
            <button
              onClick={() => setCurrentPage(pagination.total_pages)}
              disabled={!pagination.has_next}
              className="pagination-btn"
              title="Last page"
            >
              ⟩⟩
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
