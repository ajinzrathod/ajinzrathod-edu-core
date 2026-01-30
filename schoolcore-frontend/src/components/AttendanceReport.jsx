import { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import Alert from "./Alert.jsx";
import { utils as XLSXUtils, writeFile } from "xlsx";

export default function AttendanceReport({
    selectedYear: initialYear,
}) {
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [period, setPeriod] = useState("overall");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear_val, setSelectedYear_val] = useState(new Date().getFullYear());
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'classroom_name', direction: 'asc' });

    useEffect(() => {
        if (selectedYear) {
            setStatistics(null);
            setError("");
            fetchSchoolWideStatistics();
        }
    }, [selectedYear, period, selectedMonth, selectedYear_val]);

    const fetchSchoolWideStatistics = async () => {
        try {
            setLoading(true);
            setError("");
            const params = {
                year_id: selectedYear?.id,
                period: period,
            };

            // Add month and year for monthly period
            if (period === 'monthly') {
                params.month = selectedMonth;
                params.year = selectedYear_val;
            } else if (period === 'today') {
                // today will be handled on backend
            }

            const response = await api.get("attendance/school-statistics/", {
                params: params,
            });
            setStatistics(response.data);
        } catch (err) {
            const errorMessage = handleApiError(err);
            setError(errorMessage);
            setStatistics(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedClassrooms = () => {
        if (!statistics || !statistics.classroom_details) return [];

        const sorted = [...statistics.classroom_details].sort((a, b) => {
            let aValue, bValue;

            // Special handling for percentage
            if (sortConfig.key === 'percentage') {
                aValue = a.attendance_records === 0 ? 0 : (a.present_count / a.attendance_records) * 100;
                bValue = b.attendance_records === 0 ? 0 : (b.present_count / b.attendance_records) * 100;
            } else {
                aValue = a[sortConfig.key];
                bValue = b[sortConfig.key];
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortConfig.direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return sorted;
    };

    const calculateAbsent = (classroom) => {
        return classroom.attendance_records - classroom.present_count;
    };

    const calculatePercentage = (classroom) => {
        if (classroom.attendance_records === 0) return 0;
        return ((classroom.present_count / classroom.attendance_records) * 100).toFixed(2);
    };

    const hasNoAttendanceData = statistics && statistics.school_statistics.total_attendance_records === 0;

    const getAcademicYearLabel = () => {
        if (!selectedYear) return '';
        // Use the year property which contains the academic year string (e.g., "2025-2026")
        if (selectedYear.year) {
            return selectedYear.year;
        }
        return '';
    };

    const getPeriodTitle = () => {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const academicYear = getAcademicYearLabel();
        switch (period) {
            case 'today':
                return `Today (AY: ${academicYear})`;
            case 'monthly':
                return `${monthNames[selectedMonth - 1]} ${selectedYear_val} (AY: ${academicYear})`;
            default:
                return `${academicYear} (Till Today)`;
        }
    };

    const exportToExcel = () => {
        if (!statistics) {
            setError("No data to export");
            return;
        }

        // Prepare summary data
        const summaryData = [
            ['Attendance Report - ' + getPeriodTitle()],
            ['Generated on:', new Date().toLocaleDateString()],
            [],
            ['Summary Statistics'],
            ['Total Students', statistics.school_statistics.total_students],
            ['Attendance Marked', statistics.school_statistics.total_attendance_records],
            ['Present', statistics.school_statistics.total_present],
            ['Absent', statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present],
            ['Attendance Percentage', statistics.school_statistics.overall_attendance_percentage + '%'],
            [],
            ['Classroom-wise Breakdown'],
        ];

        // Prepare table header
        const tableHeader = ['Classroom', 'Students', 'Present', 'Absent', 'Total', 'Percentage'];

        // Prepare classroom data
        const classroomData = getSortedClassrooms().map(classroom => [
            classroom.classroom_name,
            classroom.student_count,
            classroom.present_count,
            calculateAbsent(classroom),
            classroom.attendance_records,
            calculatePercentage(classroom) + '%'
        ]);

        // Add total row
        classroomData.push([
            'TOTAL',
            '',
            statistics.school_statistics.total_present,
            statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present,
            statistics.school_statistics.total_attendance_records,
            ''
        ]);

        // Combine all data
        const worksheetData = [...summaryData, tableHeader, ...classroomData];

        // Create worksheet
        const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 25 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 15 }
        ];

        // Create workbook
        const workbook = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(workbook, worksheet, 'Attendance Report');

        // Generate filename
        const filename = `Attendance_Report_${getPeriodTitle().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Write file
        writeFile(workbook, filename);
    };

    const printReport = () => {
        if (!statistics) {
            setError("No data to print");
            return;
        }

        const printWindow = window.open('', '_blank');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Attendance Report - ${getPeriodTitle()}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        margin: 0 0 10px 0;
                        color: #1e40af;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .summary-cards {
                        display: grid;
                        grid-template-columns: repeat(5, 1fr);
                        gap: 15px;
                        margin-bottom: 30px;
                    }
                    .card {
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        text-align: center;
                    }
                    .card label {
                        font-size: 12px;
                        font-weight: bold;
                        color: #666;
                        text-transform: uppercase;
                    }
                    .card .value {
                        font-size: 24px;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                    .card-blue .value { color: #0066cc; }
                    .card-green .value { color: #28a745; }
                    .card-red .value { color: #dc3545; }
                    .card-emerald .value { color: #10b981; }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th {
                        background-color: #0066cc;
                        color: white;
                        padding: 12px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #ddd;
                    }
                    td {
                        padding: 12px;
                        border: 1px solid #ddd;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    tr.total {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-top: 30px;
                        margin-bottom: 15px;
                        color: #1e40af;
                    }
                    .text-center { text-align: center; }
                    .text-green { color: #28a745; }
                    .text-red { color: #dc3545; }

                    @media print {
                        body { margin: 0; }
                        .summary-cards { page-break-inside: avoid; }
                        table { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Attendance Report</h1>
                    <p><strong>Period:</strong> ${getPeriodTitle()}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                </div>

                <div class="summary-cards">
                    <div class="card card-blue">
                        <label>Total Students</label>
                        <div class="value">${statistics.school_statistics.total_students}</div>
                    </div>
                    <div class="card card-blue">
                        <label>Attendance Marked</label>
                        <div class="value">${statistics.school_statistics.total_attendance_records}</div>
                    </div>
                    <div class="card card-green">
                        <label>Present</label>
                        <div class="value">${statistics.school_statistics.total_present}</div>
                    </div>
                    <div class="card card-red">
                        <label>Absent</label>
                        <div class="value">${statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present}</div>
                    </div>
                    <div class="card card-emerald">
                        <label>Percentage</label>
                        <div class="value">${statistics.school_statistics.overall_attendance_percentage}%</div>
                    </div>
                </div>

                <div class="section-title">Classroom-wise Breakdown</div>
                <table>
                    <thead>
                        <tr>
                            <th>Classroom</th>
                            <th class="text-center">Students</th>
                            <th class="text-center">Present</th>
                            <th class="text-center">Absent</th>
                            <th class="text-center">Total</th>
                            <th class="text-center">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getSortedClassrooms().map(classroom => `
                            <tr>
                                <td>${classroom.classroom_name}</td>
                                <td class="text-center">${classroom.student_count}</td>
                                <td class="text-center text-green">${classroom.present_count}</td>
                                <td class="text-center text-red">${calculateAbsent(classroom)}</td>
                                <td class="text-center">${classroom.attendance_records}</td>
                                <td class="text-center">${calculatePercentage(classroom)}%</td>
                            </tr>
                        `).join('')}
                        <tr class="total">
                            <td>TOTAL</td>
                            <td class="text-center"></td>
                            <td class="text-center text-green">${statistics.school_statistics.total_present}</td>
                            <td class="text-center text-red">${statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present}</td>
                            <td class="text-center">${statistics.school_statistics.total_attendance_records}</td>
                            <td class="text-center"></td>
                        </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };


    if (loading) return <div className="text-center py-12 text-gray-600">Loading statistics...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {error && (
                <Alert
                    message={error}
                    type="error"
                    onClose={() => setError("")}
                />
            )}

            <div className="mb-8 flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">📊 Attendance Report</h2>
                <div className="flex gap-4 items-center">
                    <select
                        value={period}
                        onChange={(e) => {
                            setPeriod(e.target.value);
                            if (e.target.value === 'monthly') {
                                setSelectedMonth(new Date().getMonth() + 1);
                                setSelectedYear_val(new Date().getFullYear());
                            }
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="overall">Overall (Till Today)</option>
                        <option value="today">Today's Records</option>
                        <option value="monthly">Monthly</option>
                    </select>

                    {/* Month selector - only show in monthly view */}
                    {period === 'monthly' && (
                        <div className="flex gap-2 items-center">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {['January', 'February', 'March', 'April', 'May', 'June',
                                    'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                                    <option key={idx} value={idx + 1}>{month}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear_val}
                                onChange={(e) => setSelectedYear_val(parseInt(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-medium text-gray-700 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {[2024, 2025, 2026].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Export Buttons - Always Show */}
                    <div className="flex gap-2 ml-4 border-l-2 border-gray-300 pl-4">
                        <button
                            onClick={exportToExcel}
                            disabled={!statistics || statistics.school_statistics.total_attendance_records === 0}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center gap-2 shadow-md hover:shadow-lg"
                            title="Export to Excel (.xlsx)"
                        >
                            📊 Excel
                        </button>
                        <button
                            onClick={printReport}
                            disabled={!statistics || statistics.school_statistics.total_attendance_records === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center gap-2 shadow-md hover:shadow-lg"
                            title="Print Report"
                        >
                            🖨️ Print
                        </button>
                    </div>
                </div>
            </div>

            {statistics && selectedYear ? (
                <div>
                    {/* Info Message */}
                    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-sm text-blue-800">
                            <span className="font-semibold">📝 Note:</span> This report shows only the attendance records that have been marked. To see a complete summary of all classes and students, please ensure all attendance is filled first.
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Total Students</h4>
                            <p className="text-4xl font-bold text-blue-600">
                                {statistics.school_statistics.total_students}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Attendance Marked</h4>
                            <p className="text-4xl font-bold text-blue-600">
                                {statistics.school_statistics.total_attendance_records}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Present</h4>
                            <p className="text-4xl font-bold text-green-600">
                                {statistics.school_statistics.total_present}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Absent</h4>
                            <p className="text-4xl font-bold text-red-600">
                                {statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present}
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Percentage</h4>
                            <p className="text-4xl font-bold text-emerald-600">
                                {statistics.school_statistics.overall_attendance_percentage}%
                            </p>
                        </div>
                    </div>

                    {/* No Data Warning */}
                    {hasNoAttendanceData && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <p className="text-sm text-yellow-800">
                                <span className="font-semibold">⚠️ No Data Yet:</span> No attendance has been marked for the selected period. Start by filling attendance in the Attendance section.
                            </p>
                        </div>
                    )}

                    {/* Classroom Details Table */}
                    {statistics.classroom_details.length > 0 && !hasNoAttendanceData && (
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800">Classroom-wise Breakdown</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-gray-200">
                                            <th
                                                onClick={() => handleSort('classroom_name')}
                                                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
                                            >
                                                Classroom {sortConfig.key === 'classroom_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('present_count')}
                                                className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
                                            >
                                                Present {sortConfig.key === 'present_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('attendance_records')}
                                                className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
                                            >
                                                Absent {sortConfig.key === 'attendance_records' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('attendance_records')}
                                                className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
                                            >
                                                Total {sortConfig.key === 'attendance_records' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                onClick={() => handleSort('percentage')}
                                                className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition"
                                            >
                                                Percentage {sortConfig.key === 'percentage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {getSortedClassrooms().map((classroom, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 text-sm font-medium text-blue-600">
                                                    {classroom.classroom_name} <span className="text-gray-500 font-normal">({classroom.student_count})</span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">
                                                    {classroom.present_count}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">
                                                    {calculateAbsent(classroom)}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                                                    {classroom.attendance_records}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-emerald-600">
                                                    {calculatePercentage(classroom)}%
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                                TOTAL
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-green-600">
                                                {statistics.school_statistics.total_present}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-red-600">
                                                {statistics.school_statistics.total_attendance_records - statistics.school_statistics.total_present}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-800">
                                                {statistics.school_statistics.total_attendance_records}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-700">
                                                —
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">Loading attendance dashboard...</div>
            )}
        </div>
    );
}
