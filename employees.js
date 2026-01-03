// ===== EMPLOYEE LIST =====
const employees = [
    { name: "Shreya Talekar" },
    { name: "Aditi Deshpande" },
    { name: "Vedant Bumrela" },
    { name: "Dr. Rajendra Tippanwar" }
];

// Time slots configuration
const timeSlots = [
    { number: 1, name: "Morning Shift", time: "8:00 AM - 2:00 PM" },
    { number: 2, name: "Day Shift", time: "11:00 AM - 5:00 PM" },
    { number: 3, name: "Evening Shift", time: "5:00 PM - 8:00 PM" },
    { number: 4, name: "Overtime Shift", time: "2:00 PM - 8:00 PM" }
];

// ===== STATE MANAGEMENT =====
let selectedDate = new Date();
let attendanceData = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    initializeDateInput();
    attendanceData = await loadAttendanceData();
    renderDashboard();
    setupEventListeners();
});

// ===== DATE HANDLING =====
function initializeDateInput() {
    const dateInput = document.getElementById('dateInput');
    dateInput.value = formatDateForInput(selectedDate);
    dateInput.max = formatDateForInput(new Date());
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

function getDateKey(date) {
    return formatDateForInput(date);
}

function isSunday(date) {
    return date.getDay() === 0;
}

// ===== RENDERING =====
function renderDashboard() {
    updateDateDisplay();

    if (isSunday(selectedDate)) {
        showSundayWarning();
    } else {
        hideSundayWarning();
        renderEmployeeSlots();
    }
}

function updateDateDisplay() {
    document.getElementById('currentDateDisplay').textContent = formatDateForDisplay(selectedDate);
    document.getElementById('dayNameDisplay').textContent = getDayName(selectedDate);
}

function showSundayWarning() {
    document.getElementById('sundayWarning').style.display = 'block';
    document.getElementById('slotsContainer').style.display = 'none';
}

function hideSundayWarning() {
    document.getElementById('sundayWarning').style.display = 'none';
    document.getElementById('slotsContainer').style.display = 'block';
}

function renderEmployeeSlots() {
    const dateKey = getDateKey(selectedDate);

    // Clear all slots
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`slot${i}`).innerHTML = '';
    }

    // Render all employees in all slots
    timeSlots.forEach(slot => {
        const slotContainer = document.getElementById(`slot${slot.number}`);

        employees.forEach(employee => {
            const employeeCard = createEmployeeCard(employee, dateKey, slot);
            slotContainer.appendChild(employeeCard);
        });
    });
}

function createEmployeeCard(employee, dateKey, slot) {
    const card = document.createElement('div');
    card.className = 'employee-card';
    card.dataset.employee = employee.name;

    const uniqueKey = `${employee.name}_Slot${slot.number}`;
    const attendanceInfo = getAttendanceInfo(dateKey, uniqueKey);
    const currentStatus = attendanceInfo.status;
    const checkInTime = attendanceInfo.checkInTime || '';
    const checkOutTime = attendanceInfo.checkOutTime || '';

    card.innerHTML = `
        <div class="employee-info">
            <div class="employee-name">${employee.name}</div>
            <div class="employee-shift">${slot.name}</div>
        </div>
        <div class="attendance-controls">
            <button class="attendance-btn ${currentStatus === 'present' ? 'present active' : 'present'}" 
                    data-unique-key="${uniqueKey}"
                    data-employee="${employee.name}" 
                    data-status="present"
                    data-slot="${slot.number}">
                Present
            </button>
            <button class="attendance-btn ${currentStatus === 'absent' ? 'absent active' : 'absent'}" 
                    data-unique-key="${uniqueKey}"
                    data-employee="${employee.name}" 
                    data-status="absent"
                    data-slot="${slot.number}">
                Absent
            </button>
        </div>
        <div class="time-inputs">
            <div class="time-input-group">
                <label>Check-In</label>
                <input type="time" 
                       class="time-input check-in-input" 
                       value="${checkInTime}"
                       data-unique-key="${uniqueKey}"
                       data-employee="${employee.name}"
                       data-slot="${slot.number}"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
            <div class="time-input-group">
                <label>Check-Out</label>
                <input type="time" 
                       class="time-input check-out-input" 
                       value="${checkOutTime}"
                       data-unique-key="${uniqueKey}"
                       data-employee="${employee.name}"
                       data-slot="${slot.number}"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
        </div>
    `;

    const buttons = card.querySelectorAll('.attendance-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', handleAttendanceClick);
    });

    const checkInInput = card.querySelector('.check-in-input');
    const checkOutInput = card.querySelector('.check-out-input');

    checkInInput.addEventListener('change', handleTimeChange);
    checkOutInput.addEventListener('change', handleTimeChange);

    return card;
}

// ===== ATTENDANCE HANDLING =====
function handleAttendanceClick(event) {
    const button = event.currentTarget;
    const employeeName = button.dataset.employee;
    const uniqueKey = button.dataset.uniqueKey;
    const status = button.dataset.status;
    const slotNum = button.dataset.slot;
    const dateKey = getDateKey(selectedDate);

    const slot = timeSlots.find(s => s.number == slotNum);

    if (!attendanceData[dateKey]) {
        attendanceData[dateKey] = {};
    }

    const currentData = attendanceData[dateKey][uniqueKey];
    const currentStatus = currentData?.status;

    if (currentStatus === status) {
        delete attendanceData[dateKey][uniqueKey];
    } else {
        attendanceData[dateKey][uniqueKey] = {
            status: status,
            timeSlot: slot.time,
            slotName: slot.name,
            slotNumber: slot.number,
            checkInTime: currentData?.checkInTime || '',
            checkOutTime: currentData?.checkOutTime || ''
        };
    }

    saveAttendanceData();
    renderDashboard();
}

function handleTimeChange(event) {
    const input = event.currentTarget;
    const uniqueKey = input.dataset.uniqueKey;
    const dateKey = getDateKey(selectedDate);
    const isCheckIn = input.classList.contains('check-in-input');

    if (!attendanceData[dateKey] || !attendanceData[dateKey][uniqueKey]) {
        return;
    }

    if (isCheckIn) {
        attendanceData[dateKey][uniqueKey].checkInTime = input.value;
    } else {
        attendanceData[dateKey][uniqueKey].checkOutTime = input.value;
    }

    saveAttendanceData();
}

function getAttendanceInfo(dateKey, key) {
    const data = attendanceData[dateKey]?.[key];
    if (data) {
        return {
            status: data.status,
            checkInTime: data.checkInTime || '',
            checkOutTime: data.checkOutTime || ''
        };
    }
    return { status: null, checkInTime: '', checkOutTime: '' };
}

// ===== DATA PERSISTENCE =====
const API_URL = 'http://localhost:3000/api/employees';

async function loadAttendanceData() {
    try {
        const response = await fetch(`${API_URL}/attendance`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Failed to load employee attendance data');
            return {};
        }
    } catch (error) {
        console.error('Error loading employee attendance data:', error);
        return {};
    }
}

async function saveAttendanceData() {
    const dateKey = getDateKey(selectedDate);
    const dateData = attendanceData[dateKey] || {};

    try {
        const response = await fetch(`${API_URL}/attendance/${dateKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dateData),
        });

        if (!response.ok) {
            console.error('Failed to save employee attendance data');
        }
    } catch (error) {
        console.error('Error saving employee attendance data:', error);
    }
}

// ===== EXPORT FUNCTIONALITY =====
async function exportToCSV() {
    try {
        const response = await fetch(`${API_URL}/export/csv`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `employee-attendance-${formatDateForInput(new Date())}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('Failed to export data. Please try again.');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data. Make sure the server is running.');
    }
}

// ===== DATABASE VIEW =====
async function refreshDatabaseView() {
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading data...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/attendance/raw`);
        if (response.ok) {
            const records = await response.json();
            renderDatabaseTable(records);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Failed to load records</td></tr>';
        }
    } catch (error) {
        console.error('Error loading raw employee data:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Error connecting to server</td></tr>';
    }
}

function renderDatabaseTable(records) {
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No records found in database</td></tr>';
        return;
    }

    records.forEach(record => {
        const row = document.createElement('tr');
        const date = new Date(record.date);
        const createdAt = new Date(record.createdAt);

        row.innerHTML = `
            <td>${formatDateForDisplay(date)}</td>
            <td style="font-weight: 500; color: var(--text-primary);">${record.employeeName}</td>
            <td><span class="status-badge ${record.status}">${record.status}</span></td>
            <td>${record.timeSlot || 'N/A'}</td>
            <td>${record.checkInTime || 'N/A'}</td>
            <td>${record.checkOutTime || 'N/A'}</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${createdAt.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// ===== ANALYTICS / REPORTS =====
function initializeReportsView() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateInput = document.getElementById('reportStartDate');
    const endDateInput = document.getElementById('reportEndDate');

    startDateInput.value = formatDateForInput(firstDayOfMonth);
    endDateInput.value = formatDateForInput(today);
    startDateInput.max = formatDateForInput(today);
    endDateInput.max = formatDateForInput(today);

    document.getElementById('generateReportBtn').addEventListener('click', generateAnalytics);
    generateAnalytics();
}

async function generateAnalytics() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date must be before or equal to end date');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/analytics?startDate=${startDate}&endDate=${endDate}`);

        if (response.ok) {
            const data = await response.json();
            renderAnalytics(data);
        } else {
            alert('Failed to generate report. Please try again.');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        alert('Error generating report. Make sure the server is running.');
    }
}

function renderAnalytics(data) {
    // Store data for CSV export
    currentReportData = data;

    document.getElementById('totalWorkingDays').textContent = data.totalWorkingDays;
    document.getElementById('totalRecordedDays').textContent = data.totalRecordedDays;

    const avgAttendance = data.employees.length > 0
        ? (data.employees.reduce((sum, emp) => sum + emp.attendanceRate, 0) / data.employees.length).toFixed(1)
        : 0;
    document.getElementById('averageAttendance').textContent = avgAttendance + '%';

    renderEmployeeStatsTable(data.employees);

    // Show download button after report is generated
    document.getElementById('downloadReportCsvBtn').style.display = 'inline-block';
}

function renderEmployeeStatsTable(employees) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No employee data found for selected date range</td></tr>';
        return;
    }

    employees.forEach(emp => {
        const row = document.createElement('tr');

        let perfClass = 'perf-low';
        let perfLabel = 'Needs Improvement';
        if (emp.attendanceRate >= 90) {
            perfClass = 'perf-high';
            perfLabel = 'Excellent';
        } else if (emp.attendanceRate >= 75) {
            perfClass = 'perf-medium';
            perfLabel = 'Good';
        }

        const attendanceBar = createAttendanceBar(emp.attendanceRate);

        row.innerHTML = `
            <td style="font-weight: 600; color: var(--text-primary);">${emp.name}</td>
            <td><span class="stat-badge present-badge">${emp.presentDays}</span></td>
            <td><span class="stat-badge absent-badge">${emp.absentDays}</span></td>
            <td><span class="stat-badge overtime-badge">${emp.overtimeDays}</span></td>
            <td>
                <div class="attendance-rate-container">
                    <span class="attendance-rate-text">${emp.attendanceRate}%</span>
                    ${attendanceBar}
                </div>
            </td>
            <td><span class="perf-indicator ${perfClass}">${perfLabel}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function createAttendanceBar(rate) {
    let color = '#F43F5E';
    if (rate >= 90) color = '#10B981';
    else if (rate >= 75) color = '#F59E0B';

    return `
        <div class="attendance-bar">
            <div class="attendance-bar-fill" style="width: ${rate}%; background: ${color};"></div>
        </div>
    `;
}

// Download analytics report as CSV
let currentReportData = null; // Store current report data

function downloadReportCSV() {
    if (!currentReportData) {
        alert('Please generate a report first');
        return;
    }

    const { totalWorkingDays, totalRecordedDays, dateRange, employees } = currentReportData;

    // Calculate average attendance
    const avgAttendance = employees.length > 0
        ? (employees.reduce((sum, emp) => sum + emp.attendanceRate, 0) / employees.length).toFixed(2)
        : 0;

    // Create CSV content
    const rows = [];

    // Header section
    rows.push(['Employee Attendance Report']);
    rows.push(['Generated on:', new Date().toLocaleString()]);
    rows.push(['Date Range:', `${dateRange.start} to ${dateRange.end}`]);
    rows.push([]);

    // Summary section
    rows.push(['SUMMARY STATISTICS']);
    rows.push(['Total Working Days (excluding Sundays):', totalWorkingDays]);
    rows.push(['Days with Recorded Attendance:', totalRecordedDays]);
    rows.push(['Average Attendance Rate:', `${avgAttendance}%`]);
    rows.push([]);

    // Employee statistics header
    rows.push(['EMPLOYEE STATISTICS']);
    rows.push(['Employee Name', 'Present Days', 'Absent Days', 'Overtime Days', 'Total Slot Attendances', 'Attendance Rate (%)', 'Performance']);

    // Employee data
    employees.forEach(emp => {
        let performance = 'Needs Improvement';
        if (emp.attendanceRate >= 90) {
            performance = 'Excellent';
        } else if (emp.attendanceRate >= 75) {
            performance = 'Good';
        }

        rows.push([
            emp.name,
            emp.presentDays,
            emp.absentDays,
            emp.overtimeDays,
            emp.totalSlotAttendances,
            emp.attendanceRate,
            performance
        ]);
    });

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${dateRange.start}-to-${dateRange.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('dateInput').addEventListener('change', async (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        attendanceData = await loadAttendanceData();
        renderDashboard();
    });

    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Download report CSV button
    document.getElementById('downloadReportCsvBtn').addEventListener('click', downloadReportCSV);

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.view-section').forEach(v => {
                v.style.display = 'none';
                v.classList.remove('active');
            });
            const viewId = tab.dataset.tab + 'View';
            const view = document.getElementById(viewId);
            view.style.display = 'block';
            setTimeout(() => view.classList.add('active'), 10);

            if (tab.dataset.tab === 'database') {
                refreshDatabaseView();
            } else if (tab.dataset.tab === 'reports') {
                initializeReportsView();
            }
        });
    });
}
