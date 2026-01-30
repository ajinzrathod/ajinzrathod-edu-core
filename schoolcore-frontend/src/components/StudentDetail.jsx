import {useState, useEffect} from "react";
import api from "../utils/api";
 import { handleApiError } from "../utils/errorHandler";
import { formatDate, formatTime } from "../utils/dateFormatter";
import Alert from "./Alert.jsx";
import "../styles/StudentDetail.css";
import Notification from "./Notification.jsx";

export default function StudentDetail({studentId, onBack, selectedYear}) {
    const [student, setStudent] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [weekendDays, setWeekendDays] = useState([]); // Empty by default - will be filled by fetch
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notification, setNotification] = useState(null);
    const [filter, setFilter] = useState("all");
    const [refreshedYear, setRefreshedYear] = useState(null); // Store refreshed academic year data
    const [selectedMonth, setSelectedMonth] = useState(() => {
        // Default to the start month of the academic year
        // This will be updated when selectedYear is available
        return null; // Will be set by useEffect when selectedYear loads
    });
    const [localChanges, setLocalChanges] = useState({});
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState("");

    useEffect(() => {
        if (studentId) {
            setAttendance([]);
            setHolidays([]);
            setError("");
            fetchStudentData();
        }
    }, [studentId, selectedYear]);

    // Fetch weekends when student classroom changes
    useEffect(() => {
        if (student?.classroom) {
            fetchWeekends();
        }
    }, [student?.classroom]);

    // Set selectedMonth to the academic year's start month
    useEffect(() => {
        if (selectedYear) {
            const startMonth = new Date(selectedYear.start_date).getMonth() + 1;
            setSelectedMonth(startMonth);
        }
    }, [selectedYear?.id]);

    // Refresh academic year data from backend to get latest dates
    useEffect(() => {
        const refreshAcademicYear = async () => {
            if (!selectedYear?.id) return;
            try {
                const response = await api.get(`years/`);
                const updatedYear = response.data.find(y => y.id === selectedYear.id);
                if (updatedYear) {
                    setRefreshedYear(updatedYear);
                }
            } catch (err) {
                console.error("Error refreshing academic year:", err);
                // Fallback to original selectedYear if refresh fails
                setRefreshedYear(selectedYear);
            }
        };
        refreshAcademicYear();
    }, [selectedYear?.id]);

    // Refresh classroom data to get classroom-specific dates
    useEffect(() => {
        const refreshClassroom = async () => {
            if (!student?.classroom) return;
            try {
                // Add timestamp to bypass any browser caching
                const response = await api.get(`classrooms/${student.classroom}/?t=${Date.now()}`);
                if (response.data) {
                    console.log("✅ Fresh classroom data fetched:", response.data);

                    // Update student with fresh classroom data
                    setStudent(prev => ({
                        ...prev,
                        classroom_details: response.data
                    }));

                    // Also update refreshedYear with classroom dates
                    if (response.data.start_date || response.data.end_date) {
                        console.log("📅 Classroom dates:", response.data.start_date, "to", response.data.end_date);
                        setRefreshedYear(prev => ({
                            ...prev,
                            start_date: response.data.start_date || prev?.start_date,
                            end_date: response.data.end_date || prev?.end_date,
                        }));
                    }
                }
            } catch (err) {
                console.error("Error refreshing classroom dates:", err);
            }
        };
        refreshClassroom();
    }, [student?.classroom]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            setError("");
            const timestamp = Date.now();

            const studentRes = await api.get(`students/${studentId}/?t=${timestamp}`);
            const studentData = studentRes.data;
            setStudent(studentData);

            // Fetch classroom details if classroom exists
            if (studentData.classroom) {
                try {
                    const classRes = await api.get(`classrooms/${studentData.classroom}/?t=${timestamp}`);
                    setStudent(prev => ({
                        ...prev,
                        classroom_details: classRes.data
                    }));
                } catch (err) {
                    console.log("Could not fetch classroom details");
                }
            }

            const attendanceRes = await api.get(`attendance/student/${studentId}/`, {
                params: {year_id: selectedYear?.id, t: timestamp},
            });
            setAttendance(attendanceRes.data);

            const holidaysRes = await api.get("holidays/", {
                params: {year_id: selectedYear?.id, t: timestamp},
            });
            setHolidays(holidaysRes.data);
        } catch (err) {
            const errorMsg = handleApiError(err);
            setError(errorMsg);
            setNotification({ message: errorMsg, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const fetchWeekends = async () => {
        try {
            if (!student?.classroom) return;

            // Get weekends from the classroom
            const response = await api.get(`classrooms/${student.classroom}/?t=${Date.now()}`);
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

                console.log("✓ Fetched weekends for classroom", student.classroom, ":", weekends, "type:", typeof classroom.weekend_days);
                setWeekendDays(weekends);
            } else {
                console.log("❌ Classroom not found or no weekend_days:", student.classroom);
                setWeekendDays([]);
            }
        } catch (err) {
            console.error("Error fetching weekend configuration:", err);
            setWeekendDays([]);
        }
    };

    const getDaysInRange = () => {
        // Use classroom dates if available, otherwise use academic year dates
        let startDate = displayYear?.start_date;
        let endDate = displayYear?.end_date;

        // Check if classroom has specific dates
        if (student?.classroom_details?.start_date) {
            startDate = student.classroom_details.start_date;
        }
        if (student?.classroom_details?.end_date) {
            endDate = student.classroom_details.end_date;
        }

        if (!startDate || !endDate) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            // Include ALL dates (no filtering)
            days.push(new Date(d).toISOString().split("T")[0]);
        }

        return days;
    };

    const filterDays = (days) => {
        if (filter === "all") return days;
        if (filter === "monthly") {
            return days.filter((day) => {
                const date = new Date(day);
                // Get month from actual date (1-12)
                const month = date.getMonth() + 1;
                return month === selectedMonth;
            });
        }
        return days;
    };

    const calculateStats = (filteredDays) => {
        let present = 0;
        let absent = 0;
        let holiday = 0;
        let weekend = 0;
        let pending = 0;
        let totalDays = 0; // Total calendar days

        filteredDays.forEach((day) => {
            totalDays++;
            const status = getStatusForDate(day);
            if (status.status === "present") present++;
            else if (status.status === "absent") absent++;
            else if (status.status === "holiday") holiday++;
            else if (status.status === "weekend") {
                weekend++;
            } else if (status.status === "pending") pending++;
        });

        // Calculate percentage based on allowed days (excluding holidays and weekends)
        const allowedDays = present + absent + pending; // Days student should come
        const percentage = allowedDays > 0 ? Math.round((present / allowedDays) * 100) : 0;

        return {present, absent, holiday, weekend, pending, totalDays, allowedDays, percentage};
    };

    const getStatusForDate = (date) => {
        // Check local changes first
        if (localChanges[date] !== undefined) {
            const localValue = localChanges[date];
            if (localValue === true) return {status: "present", name: "Present"};
            if (localValue === false) return {status: "absent", name: "Absent"};
        }

        // Normalize date format (ensure YYYY-MM-DD)
        const normalizedDate = typeof date === 'string' ? date : new Date(date).toISOString().split("T")[0];

        // Find attendance record with normalized date comparison
        const attRecord = attendance.find((att) => {
            const attDate = typeof att.date === 'string' ? att.date : new Date(att.date).toISOString().split("T")[0];
            return attDate === normalizedDate;
        });

        const holiday = holidays.find((h) => {
            const holidayDate = typeof h.date === 'string' ? h.date : new Date(h.date).toISOString().split("T")[0];
            return holidayDate === normalizedDate;
        });
        const dayOfWeek = new Date(date).getDay();

        if (holiday) return {status: "holiday", name: holiday.name};

        // Check if it's a weekend - weekendDays should be an array at this point
        const isWeekend = weekendDays && Array.isArray(weekendDays) && weekendDays.includes(dayOfWeek);
        if (isWeekend) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return {status: "weekend", name: dayNames[dayOfWeek]};
        }

        if (!attRecord) return {status: "pending", name: "Not Marked"};
        return {status: attRecord.present ? "present" : "absent"};
    };

    const handleAttendanceToggle = (date) => {
        const current = localChanges[date];
        let next = null;

        if (current === undefined) {
            const existing = attendance.find(a => a.date === date);
            if (existing) {
                next = !existing.present;
            } else {
                next = true;
            }
        } else if (current === true) {
            next = false;
        } else if (current === false) {
            next = null;
        } else {
            next = true;
        }

        setLocalChanges({
            ...localChanges,
            [date]: next
        });
        setSyncStatus("not-synced");
    };

    const handleSaveAttendance = async () => {
        if (Object.keys(localChanges).length === 0) return;

        setIsSyncing(true);
        setSyncStatus("syncing");

        try {
            const attendanceRecords = Object.entries(localChanges)
                .map(([date, present]) => ({
                    student_id: studentId,
                    date: date,
                    present: present,
                    year_id: selectedYear.id,
                }))
                .filter(record => record.present !== null);

            await api.post("attendance/create/", {
                attendance: attendanceRecords
            });

            setAttendance(prev => {
                const updated = [...prev];
                Object.entries(localChanges).forEach(([date, present]) => {
                    if (present !== null) {
                        const existingIndex = updated.findIndex(a => a.date === date);
                        if (existingIndex >= 0) {
                            updated[existingIndex].present = present;
                        } else {
                            updated.push({
                                id: null,
                                date: date,
                                present: present,
                                student_id: studentId,
                                year_id: selectedYear.id
                            });
                        }
                    } else {
                        const indexToRemove = updated.findIndex(a => a.date === date);
                        if (indexToRemove >= 0) {
                            updated.splice(indexToRemove, 1);
                        }
                    }
                });
                return updated.sort((a, b) => new Date(a.date) - new Date(b.date));
            });

            setLocalChanges({});
            setSyncStatus("synced");
            setNotification({ message: "Attendance saved successfully!", type: "success" });
            setTimeout(() => setSyncStatus(""), 3000);
        } catch (err) {
            console.error("Error saving attendance:", err);
            setSyncStatus("not-synced");
            const errorMsg = "Error saving attendance: " + (err.response?.data?.detail || err.message);
            setNotification({ message: errorMsg, type: "error" });
        } finally {
            setIsSyncing(false);
        }
    };

    const hasUnsavedChanges = Object.keys(localChanges).length > 0;

    if (loading)
        return <div className="student-detail-loading">Loading student data...</div>;
    if (!student) return <div className="student-detail-error">Student not found</div>;

    // Use refreshed year data if available, otherwise use selectedYear
    const displayYear = refreshedYear || selectedYear;

    const allDays = getDaysInRange();
    const filteredDays = filterDays(allDays);
    // Always calculate stats from entire academic year, not just filtered view
    const stats = calculateStats(allDays);


    return (
        <div className="student-detail-container">
            {error && (
                <Alert
                    message={error}
                    type="error"
                    onClose={() => setError("")}
                />
            )}

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}

            <div className="student-detail-header">
                <div className="student-info">
                    <>
                        <h1>{student.user_full_name}</h1>
                        <p className="enrollment">Enrollment: {student.enrollment_number}</p>
                        <p className="year">Academic Year: {displayYear?.year}</p>
                        {student?.classroom_details?.start_date && student?.classroom_details?.end_date && (
                            <p className="date-range">
                                📅 {formatDate(student.classroom_details.start_date)} to{" "}
                                {formatDate(student.classroom_details.end_date)}
                            </p>
                        )}
                    </>
                </div>
            </div>

            {hasUnsavedChanges && (
                <div className="sync-status-bar">
                    <div className="sync-status">
                        <span className="status-indicator not-synced">● Not Synced</span>
                        <span className="changes-count">{Object.keys(localChanges).length} unsaved change(s)</span>
                    </div>
                    <button
                        className="btn-primary"
                        onClick={handleSaveAttendance}
                        disabled={isSyncing || loading}
                    >
                        {isSyncing ? "⏳ Saving..." : "💾 Save Attendance"}
                    </button>
                </div>
            )}
            {syncStatus === "synced" && (
                <div className="sync-status-bar success">
                    <span className="status-indicator synced">✓ Synced</span>
                </div>
            )}

            <div className="stats-cards">
                <div className="stat-card present">
                    <h4>Present</h4>
                    <p className="number">{stats.present}</p>
                </div>
                <div className="stat-card absent">
                    <h4>Absent</h4>
                    <p className="number">{stats.absent}</p>
                </div>
                <div className="stat-card holiday">
                    <h4>Holidays</h4>
                    <p className="number">{stats.holiday}</p>
                </div>
                <div className="stat-card weekend">
                    <h4>Weekends/No-need</h4>
                    <p className="number">{stats.weekend}</p>
                </div>
                <div className="stat-card pending">
                    <h4>Pending</h4>
                    <p className="number">{stats.pending}</p>
                </div>
            </div>

            <div className="attendance-progress">
                <div className="progress-header">
                    <span className="progress-label">Attendance Progress</span>
                    <span className="progress-value">{stats.percentage}%</span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-segment present"
                        style={{width: `${(stats.present / stats.allowedDays) * 100}%`}}
                        title={`Present: ${stats.present} days`}
                    >
                        {(stats.present / stats.allowedDays) * 100 > 5 && <span className="segment-label">Present</span>}
                    </div>
                    <div
                        className="progress-segment absent"
                        style={{width: `${(stats.absent / stats.allowedDays) * 100}%`}}
                        title={`Absent: ${stats.absent} days`}
                    >
                        {(stats.absent / stats.allowedDays) * 100 > 5 && <span className="segment-label">Absent</span>}
                    </div>
                    <div
                        className="progress-segment pending"
                        style={{width: `${(stats.pending / stats.allowedDays) * 100}%`}}
                        title={`Pending: ${stats.pending} days`}
                    >
                        {(stats.pending / stats.allowedDays) * 100 > 5 && <span className="segment-label">Pending</span>}
                    </div>
                </div>
                <div className="progress-legend">
                    <div className="legend-item">
                        <span className="legend-color present"></span>
                        <span className="legend-text">Present: {stats.present}</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color absent"></span>
                        <span className="legend-text">Absent: {stats.absent}</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color pending"></span>
                        <span className="legend-text">Pending: {stats.pending}</span>
                    </div>
                </div>
            </div>

            <div className="calculation-breakdown">
                <p className="calc-label">📊 How {stats.allowedDays} Days Calculated:</p>
                <p className="calc-formula">
                    {stats.totalDays} Total Days − {stats.holiday} Holidays − {stats.weekend} Weekends = {stats.allowedDays} Expected
                </p>
            </div>


            <div className="attendance-filters">
                <label>View:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="monthly">Monthly View</option>
                    <option value="all">Full Year (All Days)</option>
                </select>

                {filter === "monthly" && (
                    <>
                        <label>Month:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        >
                            {(() => {
                                if (!displayYear) return null;

                                const start = new Date(displayYear.start_date);
                                const end = new Date(displayYear.end_date);
                                const months = [];

                                // Generate months from academic year start to end
                                let current = new Date(start.getFullYear(), start.getMonth());
                                while (current <= end) {
                                    const month = current.getMonth() + 1;
                                    const year = current.getFullYear();
                                    months.push(
                                        <option key={`${year}-${month}`} value={month}>
                                            {current.toLocaleString("default", {month: "long", year: "numeric"})}
                                        </option>
                                    );
                                    current.setMonth(current.getMonth() + 1);
                                }

                                return months;
                            })()}
                        </select>
                    </>
                )}
            </div>

            <div className="attendance-timeline">
                <h3>Attendance Timeline</h3>

                <div className="weekly-timeline" key={`timeline-${weekendDays.toString()}`}>
                    {filteredDays.length > 0 ? (
                        (() => {
                            const monthsData = {};

                            filteredDays.forEach((day) => {
                                const date = new Date(day);
                                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                                if (!monthsData[monthKey]) {
                                    monthsData[monthKey] = {
                                        month: date.toLocaleString("default", {month: "long", year: "numeric"}),
                                        days: []
                                    };
                                }
                                monthsData[monthKey].days.push(day);
                            });

                            return Object.entries(monthsData).map(([monthKey, monthData]) => {
                                return (
                                    <div key={monthKey} className="month-section">
                                        <h4 className="month-title">{monthData.month}</h4>
                                        <div className="month-days">
                                            {monthData.days.map((day) => {
                                                const dayStatus = getStatusForDate(day);
                                                const dayDate = new Date(day);
                                                const dayName = dayDate.toLocaleDateString("default", {
                                                    weekday: "short",
                                                });
                                                const date = dayDate.getDate();

                                                let dayIcon = "—";
                                                let statusLabel = "Not yet marked";
                                                if (dayStatus.status === "present") {
                                                    dayIcon = "✓";
                                                    statusLabel = "Present";
                                                } else if (dayStatus.status === "absent") {
                                                    dayIcon = "✗";
                                                    statusLabel = "Absent";
                                                } else if (dayStatus.status === "holiday") {
                                                    dayIcon = "🗓️";
                                                    statusLabel = dayStatus.name;
                                                } else if (dayStatus.status === "weekend") {
                                                    dayIcon = "📅";
                                                    statusLabel = "Weekend";
                                                }

                                                const isModified = localChanges[day] !== undefined;
                                                const isFutureDate = new Date(day) > new Date();
                                                const isClickable = dayStatus.status !== "holiday" && dayStatus.status !== "weekend" && !isFutureDate;

                                                return (
                                                    <div
                                                        key={day}
                                                        className={`day-cell ${dayStatus.status} ${isModified ? 'modified' : ''} ${isClickable ? 'clickable' : ''} ${isFutureDate ? 'future-date' : ''}`}
                                                        data-tooltip={isFutureDate ? "Cannot mark future dates" : statusLabel}
                                                        onClick={() => isClickable && handleAttendanceToggle(day)}
                                                        style={{cursor: isClickable ? 'pointer' : 'not-allowed', opacity: isFutureDate ? 0.5 : 1}}
                                                    >
                                                        <div className="day-short-name">{dayName}</div>
                                                        <div className="day-date-num">{date}</div>
                                                        <div className="day-icon">{isFutureDate ? "🚫" : dayIcon}</div>
                                                        <div className="day-label">{isFutureDate ? "Future" : statusLabel}</div>
                                                        {isModified && <div className="sync-badge">Not Synced</div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()
                    ) : (
                        <p className="no-data">No school days in this period</p>
                    )}
                </div>
            </div>

            <div className="monthly-summary">
                <h3>Monthly Summary (Academic Year: {displayYear?.year})</h3>
                <p className="year-range">
                    📅 {student?.classroom_details?.start_date ?
                        formatDate(student.classroom_details.start_date)
                        : "N/A"} to {student?.classroom_details?.end_date ?
                        formatDate(student.classroom_details.end_date)
                        : "N/A"}
                </p>
                <table>
                    <thead>
                    <tr>
                        <th title="Month and year with date range">📅 Month (Dates)</th>
                        <th title="Total calendar days in this month">📆 Total Days</th>
                        <th title="Official holidays - no need to attend">🏖️ Holidays</th>
                        <th title="Weekends - no need to attend">📅 Weekends</th>
                        <th colSpan="1"
                            title="Result of (Total - Holidays - Weekends) AND sum of (Present + Absent + Pending)"
                            className="expected-pivot">🎯 Expected Days
                        </th>
                        <th title="Days student was present in school">✅ Present</th>
                        <th title="Days student was absent from school">❌ Absent</th>
                        <th title="Days not yet marked - waiting for entry">📝 Pending Entry</th>
                    </tr>
                    <tr className="formula-row">
                        <td></td>
                        <td className="formula-text" title="Starting point">Total</td>
                        <td className="formula-minus" title="Subtract">−</td>
                        <td className="formula-minus" title="Subtract">−</td>
                        <td className="formula-center-label">=</td>
                        <td className="formula-center-label">+</td>
                        <td className="formula-center-label">+</td>
                        <td className="formula-center-label">+</td>
                    </tr>
                    </thead>
                    <tbody>
                    {(() => {
                        // Get start and end dates from classroom, not academic year
                        const classroomStartDate = student?.classroom_details?.start_date ?
                            new Date(student.classroom_details.start_date) : null;
                        const classroomEndDate = student?.classroom_details?.end_date ?
                            new Date(student.classroom_details.end_date) : null;

                        if (!classroomStartDate || !classroomEndDate) {
                            return <tr><td colSpan="8" className="no-data">No classroom date range available</td></tr>;
                        }

                        const startMonth = classroomStartDate.getMonth();
                        const startYear = classroomStartDate.getFullYear();
                        const endMonth = classroomEndDate.getMonth();
                        const endYear = classroomEndDate.getFullYear();

                        // Calculate number of months
                        const monthsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

                        return Array.from({length: monthsCount}, (_, i) => {
                            // Calculate month and year
                            let actualMonth = startMonth + i;
                            let actualYear = startYear;
                            if (actualMonth > 11) {
                                actualMonth -= 12;
                                actualYear += 1;
                            }

                            const monthDays = allDays.filter((day) => {
                                const d = new Date(day);
                                return d.getMonth() === actualMonth && d.getFullYear() === actualYear;
                            });

                            if (monthDays.length === 0) return null;

                            const monthStats = calculateStats(monthDays);
                            const monthName = new Date(actualYear, actualMonth).toLocaleString("default", {
                                month: "long",
                            });

                            // Always show date range
                            const monthStartDate = new Date(monthDays[0]);
                            const monthEndDate = new Date(monthDays[monthDays.length - 1]);

                            const monthDisplay = `${monthName} ${actualYear} (${monthStartDate.getDate()}-${monthEndDate.getDate()})`;

                            // Verify totals add up
                            const checksum = monthStats.present + monthStats.absent + monthStats.holiday + monthStats.weekend + monthStats.pending;

                            return (
                                <tr key={`${actualYear}-${actualMonth}`}>
                                    <td className="month-name">
                                        {monthDisplay}
                                    </td>
                                    <td className="total-days">{monthStats.totalDays}</td>
                                    <td className="holiday-text">{monthStats.holiday}</td>
                                    <td className="weekend-text">{monthStats.weekend}</td>
                                    <td className="allowed-days">
                                        <strong>{monthStats.allowedDays}</strong>
                                        {checksum !== monthStats.totalDays && <span className="warning">⚠</span>}
                                    </td>
                                    <td className="present-text">{monthStats.present}</td>
                                    <td className="absent-text">{monthStats.absent}</td>
                                    <td className="pending-entry">{monthStats.pending}</td>
                                </tr>
                            );
                        });
                    })()}
                    </tbody>
                    <tfoot>
                    <tr className="total-row">
                        <td className="month-name total-label">📊 TOTAL</td>
                        <td className="total-days">{stats.totalDays}</td>
                        <td className="holiday-text">{stats.holiday}</td>
                        <td className="weekend-text">{stats.weekend}</td>
                        <td className="allowed-days">
                            <strong>{stats.allowedDays}</strong>
                        </td>
                        <td className="present-text">{stats.present}</td>
                        <td className="absent-text">{stats.absent}</td>
                        <td className="pending-entry">{stats.pending}</td>
                    </tr>
                    </tfoot>
                </table>
                <div className="table-legend">
                    <p><strong>📊 How to Read This Table:</strong></p>
                    <div className="legend-grid">
                        <div className="legend-section">
                            <h4>📅 LEFT SIDE</h4>
                            <p style={{margin: '8px 0', fontSize: '13px', color: '#666'}}>Calendar Math</p>
                            <div className="legend-item">
                                <span className="legend-label">📆 Total Days:</span> <span className="legend-desc">All days</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-label">🏖️ Holidays:</span> <span className="legend-desc">Remove</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-label">📅 Weekends:</span> <span className="legend-desc">Remove</span>
                            </div>
                        </div>
                        <div className="legend-section" style={{backgroundColor: '#e3f2fd', borderColor: '#0066cc', borderWidth: '3px'}}>
                            <h4 style={{color: '#0066cc', fontSize: '16px', margin: '0 0 8px 0'}}>🎯 PIVOT</h4>
                            <p style={{margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#0066cc', textAlign: 'center'}}>
                                Expected Days
                            </p>
                            <p style={{margin: '0', fontSize: '12px', color: '#0066cc', textAlign: 'center', lineHeight: '1.4'}}>
                                Target number<br/>
                                Days should attend
                            </p>
                        </div>
                        <div className="legend-section">
                            <h4>✏️ RIGHT SIDE</h4>
                            <p style={{margin: '8px 0', fontSize: '13px', color: '#666'}}>Must add to Expected</p>
                            <div className="legend-item">
                                <span className="legend-label">✅ Present:</span> <span className="legend-desc">Attended</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-label">❌ Absent:</span> <span className="legend-desc">Missed</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-label">📝 Pending:</span> <span className="legend-desc">Not marked</span>
                            </div>
                        </div>
                    </div>
                    <div style={{background: '#fff9e6', border: '2px solid #ffc107', borderRadius: '6px', padding: '12px', marginTop: '15px'}}>
                        <p style={{margin: '0', fontSize: '13px', fontWeight: '600', color: '#ff9800'}}>
                            ✅ Check: Expected = Present + Absent + Pending
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

