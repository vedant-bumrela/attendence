// ===== EMPLOYEE LIST =====
const employees = [
    { name: "Ms. Shreya Talekar" },
    { name: "Ms. Aditi Deshpande" },
    { name: "Mr. Vedant Bumrela" },
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
    dateInput.max = formatDateForInput(new Date()); // Can't mark future attendance
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

    // Create unique key for this slot: EmployeeName_SlotX
    const uniqueKey = `${employee.name}_Slot${slot.number}`;

    // Check attendance using unique key
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

    // Add click handlers
    const buttons = card.querySelectorAll('.attendance-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', handleAttendanceClick);
    });

    // Add change handlers for time inputs
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

    // Find slot info
    const slot = timeSlots.find(s => s.number == slotNum);

    // Update attendance data
    if (!attendanceData[dateKey]) {
        attendanceData[dateKey] = {};
    }

    // Check current status
    const currentData = attendanceData[dateKey][uniqueKey];
    const currentStatus = currentData?.status;

    if (currentStatus === status) {
        // Toggle off - remove the entry
        delete attendanceData[dateKey][uniqueKey];
    } else {
        // Set new status
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
        return; // No attendance record exists
    }

    // Update the time
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

        console.log('Saving employee attendance data:', dateData);

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
            console.error('Failed to export data');
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Date input change
    document.getElementById('dateInput').addEventListener('change', async (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        attendanceData = await loadAttendanceData();
        renderDashboard();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch Views
            document.querySelectorAll('.view-section').forEach(v => {
                v.style.display = 'none';
                v.classList.remove('active');
            });
            const viewId = tab.dataset.tab + 'View';
            const view = document.getElementById(viewId);
            view.style.display = 'block';
            setTimeout(() => view.classList.add('active'), 10);

            // Load data if switching to database view
            if (tab.dataset.tab === 'database') {
                refreshDatabaseView();
            }
        });
    });
}
