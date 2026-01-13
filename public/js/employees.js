// ===== EMPLOYEE LIST =====
// Default employees (used when localStorage is empty)
const DEFAULT_EMPLOYEES = [
    { name: "Ms. Shreya Talekar", standardHours: 6 },      // Full-time: 6 hours
    { name: "Ms. Aditi Deshpande", standardHours: 6 },     // Full-time: 6 hours
    { name: "Mr. Vedant Bumrela", standardHours: 3 },      // Part-time: 3 hours
    { name: "Dr. Rajendra Tippanwar", standardHours: 6 }   // Full-time: 6 hours
];

// Default other staff
const DEFAULT_OTHER_STAFF = [
    { name: "Ms. Anuradha Sapkal", standardHours: 7, role: "Maid", workTime: "10:00 AM - 5:00 PM" }
];

// Dynamic employee lists (loaded from localStorage)
let employees = [];
let otherStaff = [];

// Load employees from localStorage or use defaults
function loadEmployeesFromStorage() {
    const storedEmployees = localStorage.getItem('clinic_employees');
    const storedOtherStaff = localStorage.getItem('clinic_other_staff');

    if (storedEmployees) {
        try {
            const parsed = JSON.parse(storedEmployees);
            // Filter out invalid entries (must have name and standardHours)
            employees = parsed.filter(emp => emp.name && emp.name.trim() && emp.standardHours != null);
        } catch (e) {
            console.error('Error loading employees:', e);
            employees = [...DEFAULT_EMPLOYEES];
        }
    } else {
        employees = [...DEFAULT_EMPLOYEES];
    }

    if (storedOtherStaff) {
        try {
            const parsed = JSON.parse(storedOtherStaff);
            // Filter out invalid entries
            otherStaff = parsed.filter(emp => emp.name && emp.name.trim() && emp.standardHours != null);
        } catch (e) {
            console.error('Error loading other staff:', e);
            otherStaff = [...DEFAULT_OTHER_STAFF];
        }
    } else {
        otherStaff = [...DEFAULT_OTHER_STAFF];
    }

    // Save cleaned data back to storage
    saveEmployeesToStorage();
}

// Save employees to localStorage
function saveEmployeesToStorage() {
    localStorage.setItem('clinic_employees', JSON.stringify(employees));
    localStorage.setItem('clinic_other_staff', JSON.stringify(otherStaff));
}

// Add new employee
function addEmployee(empData) {
    if (empData.type === 'other') {
        otherStaff.push({
            name: empData.name,
            standardHours: empData.standardHours,
            role: empData.role || 'Staff',
            workTime: empData.workTime || 'N/A'
        });
    } else {
        employees.push({
            name: empData.name,
            standardHours: empData.standardHours
        });
    }
    saveEmployeesToStorage();
    renderEmployeesList();
    renderDashboard();
}

// Edit existing employee
function editEmployee(index, empData) {
    if (empData.type === 'other') {
        otherStaff[index] = {
            name: empData.name,
            standardHours: empData.standardHours,
            role: empData.role || 'Staff',
            workTime: empData.workTime || 'N/A'
        };
    } else {
        employees[index] = {
            name: empData.name,
            standardHours: empData.standardHours
        };
    }
    saveEmployeesToStorage();
    renderEmployeesList();
    renderDashboard();
}

// Delete employee
function deleteEmployee(index, isOtherStaff = false) {
    const list = isOtherStaff ? otherStaff : employees;
    const empName = list[index].name;

    if (confirm(`Are you sure you want to delete "${empName}"?\n\nThis action cannot be undone.`)) {
        if (isOtherStaff) {
            otherStaff.splice(index, 1);
        } else {
            employees.splice(index, 1);
        }
        saveEmployeesToStorage();
        renderEmployeesList();
        renderDashboard();
    }
}

// Initialize employees on load
loadEmployeesFromStorage();

// Time slots configuration
const timeSlots = [
    { number: 1, name: "Morning Shift", time: "8:00 AM - 2:00 PM" },
    { number: 2, name: "Day Shift", time: "11:00 AM - 5:00 PM" },
    { number: 3, name: "Evening Shift", time: "5:00 PM - 8:00 PM" }
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

// ===== OVERTIME/UNDERTIME CALCULATION =====
function calculateWorkHoursDifference(checkInTime, checkOutTime, standardHours) {
    if (!checkInTime || !checkOutTime) return { overtime: 0, undertime: 0, hoursWorked: 0 };

    // Parse times (format: "HH:MM")
    const [inHour, inMin] = checkInTime.split(':').map(Number);
    const [outHour, outMin] = checkOutTime.split(':').map(Number);

    // Calculate total minutes worked
    const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    const hoursWorked = totalMinutes / 60;

    // Calculate overtime or undertime
    const difference = hoursWorked - standardHours;

    return {
        overtime: difference > 0 ? parseFloat(difference.toFixed(2)) : 0,
        undertime: difference < 0 ? parseFloat(Math.abs(difference).toFixed(2)) : 0,
        hoursWorked: parseFloat(hoursWorked.toFixed(2))
    };
}

// Keep old function for backward compatibility
function calculateOvertimeHours(checkInTime, checkOutTime, standardHours) {
    const result = calculateWorkHoursDifference(checkInTime, checkOutTime, standardHours);
    return result.overtime;
}

function formatHoursDifferenceDisplay(checkInTime, checkOutTime, standardHours) {
    const result = calculateWorkHoursDifference(checkInTime, checkOutTime, standardHours);

    if (result.overtime > 0) {
        return `<span class="overtime-badge">+${result.overtime} hrs OT</span>`;
    } else if (result.undertime > 0) {
        return `<span class="undertime-badge">-${result.undertime} hrs</span>`;
    }
    return '';
}

// Keep old function for backward compatibility
function formatOvertimeDisplay(overtimeHours) {
    if (overtimeHours <= 0) return '';
    return `+${overtimeHours} hrs OT`;
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
    for (let i = 1; i <= 3; i++) {
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

    // Render other staff (once per day, not per slot)
    renderOtherStaff(dateKey);
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

    // Calculate overtime/undertime
    const hoursDifferenceDisplay = formatHoursDifferenceDisplay(checkInTime, checkOutTime, employee.standardHours);

    card.innerHTML = `
        <div class="employee-info">
            <div class="employee-name">${employee.name}</div>
            <div class="employee-shift">${slot.name}</div>
            ${hoursDifferenceDisplay ? `<div class="hours-indicator">${hoursDifferenceDisplay}</div>` : ''}
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
                       data-standard-hours="${employee.standardHours}"
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
                       data-standard-hours="${employee.standardHours}"
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

// ===== OTHER STAFF RENDERING =====
function renderOtherStaff(dateKey) {
    const container = document.getElementById('otherStaffContainer');
    if (!container) return;

    container.innerHTML = '';

    otherStaff.forEach(staff => {
        const staffCard = createOtherStaffCard(staff, dateKey);
        container.appendChild(staffCard);
    });
}

function createOtherStaffCard(staff, dateKey) {
    const card = document.createElement('div');
    card.className = 'employee-card other-staff-card';
    card.dataset.employee = staff.name;

    // Use a simple key without slot number for other staff
    const uniqueKey = `${staff.name}_Daily`;
    const attendanceInfo = getAttendanceInfo(dateKey, uniqueKey);
    const currentStatus = attendanceInfo.status;
    const checkInTime = attendanceInfo.checkInTime || '';
    const checkOutTime = attendanceInfo.checkOutTime || '';

    // Calculate overtime/undertime
    const hoursDifferenceDisplay = formatHoursDifferenceDisplay(checkInTime, checkOutTime, staff.standardHours);

    card.innerHTML = `
        <div class="employee-info">
            <div class="employee-name">${staff.name}</div>
            <div class="employee-shift">${staff.role} • ${staff.workTime}</div>
            ${hoursDifferenceDisplay ? `<div class="hours-indicator">${hoursDifferenceDisplay}</div>` : ''}
        </div>
        <div class="attendance-controls">
            <button class="attendance-btn ${currentStatus === 'present' ? 'present active' : 'present'}" 
                    data-unique-key="${uniqueKey}"
                    data-employee="${staff.name}" 
                    data-status="present"
                    data-is-other-staff="true">
                Present
            </button>
            <button class="attendance-btn ${currentStatus === 'absent' ? 'absent active' : 'absent'}" 
                    data-unique-key="${uniqueKey}"
                    data-employee="${staff.name}" 
                    data-status="absent"
                    data-is-other-staff="true">
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
                       data-employee="${staff.name}"
                       data-standard-hours="${staff.standardHours}"
                       data-is-other-staff="true"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
            <div class="time-input-group">
                <label>Check-Out</label>
                <input type="time" 
                       class="time-input check-out-input" 
                       value="${checkOutTime}"
                       data-unique-key="${uniqueKey}"
                       data-employee="${staff.name}"
                       data-standard-hours="${staff.standardHours}"
                       data-is-other-staff="true"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
        </div>
    `;

    const buttons = card.querySelectorAll('.attendance-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', handleOtherStaffAttendanceClick);
    });

    const checkInInput = card.querySelector('.check-in-input');
    const checkOutInput = card.querySelector('.check-out-input');

    checkInInput.addEventListener('change', handleOtherStaffTimeChange);
    checkOutInput.addEventListener('change', handleOtherStaffTimeChange);

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

    renderDashboard();
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

// ===== OTHER STAFF ATTENDANCE HANDLING =====
function handleOtherStaffAttendanceClick(event) {
    const button = event.currentTarget;
    const employeeName = button.dataset.employee;
    const uniqueKey = button.dataset.uniqueKey;
    const status = button.dataset.status;
    const dateKey = getDateKey(selectedDate);

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
            timeSlot: 'Daily',
            slotName: 'Other Staff',
            slotNumber: 0, // 0 for non-slot staff
            checkInTime: currentData?.checkInTime || '',
            checkOutTime: currentData?.checkOutTime || ''
        };
    }

    saveAttendanceData();
    renderDashboard();
}

function handleOtherStaffTimeChange(event) {
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

    renderDashboard();
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
    // Direct download - browser will use Content-Disposition header for filename
    window.location.href = `${API_URL}/export/csv`;
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No records found in database</td></tr>';
        return;
    }

    records.forEach(record => {
        const row = document.createElement('tr');
        const date = new Date(record.date);
        const createdAt = new Date(record.createdAt);

        const overtimeDisplay = record.overtimeHours > 0
            ? `<span style="color: #F59E0B; font-weight: 600;">+${record.overtimeHours}</span>`
            : '-';

        row.innerHTML = `
            <td>${formatDateForDisplay(date)}</td>
            <td style="font-weight: 500; color: var(--text-primary);">${record.employeeName}</td>
            <td><span class="status-badge ${record.status}">${record.status}</span></td>
            <td>${record.timeSlot || 'N/A'}</td>
            <td>${record.checkInTime || 'N/A'}</td>
            <td>${record.checkOutTime || 'N/A'}</td>
            <td>${overtimeDisplay}</td>
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

    renderEmployeeStatsTable(data.employees);

    // Show download button after report is generated
    document.getElementById('downloadReportCsvBtn').style.display = 'inline-block';
}

function renderEmployeeStatsTable(employees) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No employee data found for selected date range</td></tr>';
        return;
    }

    employees.forEach(emp => {
        const row = document.createElement('tr');

        const attendanceBar = createAttendanceBar(emp.attendanceRate);

        row.innerHTML = `
            <td style="font-weight: 600; color: var(--text-primary);">${emp.name}</td>
            <td><span class="stat-badge present-badge">${emp.presentDays}</span></td>
            <td><span class="stat-badge absent-badge">${emp.absentDays}</span></td>
            <td><span class="stat-badge" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B;">${emp.totalOvertimeHours || 0} hrs</span></td>
            <td>
                <div class="attendance-rate-container">
                    <span class="attendance-rate-text">${emp.attendanceRate}%</span>
                    ${attendanceBar}
                </div>
            </td>
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
    rows.push([]);

    // Employee statistics header
    rows.push(['EMPLOYEE STATISTICS']);
    rows.push(['Employee Name', 'Present Days', 'Absent Days', 'Total Overtime Hours', 'Total Slot Attendances', 'Attendance Rate (%)']);

    // Employee data
    employees.forEach(emp => {
        rows.push([
            emp.name,
            emp.presentDays,
            emp.absentDays,
            emp.totalOvertimeHours || 0,
            emp.totalSlotAttendances,
            emp.attendanceRate
        ]);
    });

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Create download with proper filename
    const filename = `attendance-report-${dateRange.start}-to-${dateRange.end}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Use msSaveBlob for IE/Edge compatibility, otherwise use download link
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
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
            } else if (tab.dataset.tab === 'manage') {
                renderEmployeesList();
                setupEmployeeForm();
            }
        });
    });
}

// ===== EMPLOYEE MANAGEMENT UI =====
function renderEmployeesList() {
    const container = document.getElementById('employeesList');
    if (!container) return;

    container.innerHTML = '';

    // Render regular employees
    if (employees.length > 0) {
        const regularHeader = document.createElement('div');
        regularHeader.innerHTML = '<h4 style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Regular Employees (Shift-based)</h4>';
        container.appendChild(regularHeader);

        employees.forEach((emp, index) => {
            const item = createEmployeeItem(emp, index, false);
            container.appendChild(item);
        });
    }

    // Render other staff
    if (otherStaff.length > 0) {
        const otherHeader = document.createElement('div');
        otherHeader.innerHTML = '<h4 style="color: var(--text-secondary); margin: 1.5rem 0 1rem; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Other Staff (Daily)</h4>';
        container.appendChild(otherHeader);

        otherStaff.forEach((emp, index) => {
            const item = createEmployeeItem(emp, index, true);
            container.appendChild(item);
        });
    }

    if (employees.length === 0 && otherStaff.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No employees added yet. Use the form above to add employees.</p>';
    }
}

function createEmployeeItem(emp, index, isOther) {
    const item = document.createElement('div');
    item.className = 'doctor-item';

    const roleInfo = isOther ? `<p>${emp.role || 'Staff'} • ${emp.workTime || 'N/A'}</p>` : '';

    item.innerHTML = `
        <div class="doctor-item-info">
            <h4>${emp.name}</h4>
            <p>Standard Hours: ${emp.standardHours} hrs/day</p>
            ${roleInfo}
        </div>
        <div class="doctor-item-actions">
            <button class="btn-icon btn-edit" onclick="populateEditForm(${index}, ${isOther})">Edit</button>
            <button class="btn-icon btn-delete" onclick="deleteEmployee(${index}, ${isOther})">Delete</button>
        </div>
    `;

    return item;
}

function setupEmployeeForm() {
    const form = document.getElementById('employeeForm');
    const cancelBtn = document.getElementById('empCancelBtn');

    // Employee type toggle
    const empTypeRadios = document.querySelectorAll('input[name="empType"]');
    empTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const otherFields = document.getElementById('otherStaffFields');
            otherFields.style.display = e.target.value === 'other' ? 'block' : 'none';
        });
    });

    // Form submit handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const editIndex = document.getElementById('empEditIndex').value;
        const empType = document.querySelector('input[name="empType"]:checked').value;

        const empData = {
            name: document.getElementById('employeeName').value.trim(),
            standardHours: parseInt(document.getElementById('standardHours').value),
            type: empType,
            role: document.getElementById('empRole').value.trim(),
            workTime: document.getElementById('empWorkTime').value.trim()
        };

        if (editIndex !== '') {
            editEmployee(parseInt(editIndex), empData);
        } else {
            addEmployee(empData);
        }

        resetEmployeeForm();
    });

    // Cancel button handler
    cancelBtn.addEventListener('click', resetEmployeeForm);
}

function populateEditForm(index, isOther) {
    const emp = isOther ? otherStaff[index] : employees[index];

    document.getElementById('empEditIndex').value = index;
    document.getElementById('employeeName').value = emp.name;
    document.getElementById('standardHours').value = emp.standardHours;

    // Set employee type
    const typeRadio = document.querySelector(`input[name="empType"][value="${isOther ? 'other' : 'regular'}"]`);
    typeRadio.checked = true;

    // Show/hide other staff fields
    const otherFields = document.getElementById('otherStaffFields');
    if (isOther) {
        otherFields.style.display = 'block';
        document.getElementById('empRole').value = emp.role || '';
        document.getElementById('empWorkTime').value = emp.workTime || '';
    } else {
        otherFields.style.display = 'none';
    }

    // Store the original type for editing
    document.getElementById('empEditIndex').dataset.isOther = isOther;

    // Update form UI
    document.getElementById('empFormTitle').textContent = 'Edit Employee';
    document.getElementById('empSubmitBtnText').textContent = 'Update Employee';
    document.getElementById('empCancelBtn').style.display = 'inline-block';

    // Scroll to form
    document.querySelector('.doctor-form-card').scrollIntoView({ behavior: 'smooth' });
}

function resetEmployeeForm() {
    document.getElementById('employeeForm').reset();
    document.getElementById('empEditIndex').value = '';
    document.getElementById('empEditIndex').dataset.isOther = '';
    document.getElementById('empFormTitle').textContent = 'Add New Employee';
    document.getElementById('empSubmitBtnText').textContent = 'Add Employee';
    document.getElementById('empCancelBtn').style.display = 'none';
    document.getElementById('otherStaffFields').style.display = 'none';
    document.querySelector('input[name="empType"][value="regular"]').checked = true;
}
