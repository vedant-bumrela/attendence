// ===== DOCTOR SCHEDULES =====
const DEFAULT_DOCTORS = [
    {
        name: "Dr. Rajendra Tippanawar (GP)",
        days: [1, 2, 3, 4, 5, 6],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM"
    },
    {
        name: "Dr. Maneesha Mhamane-Atre (Homeopath)",
        days: [3, 6],
        slots: [2],
        specialSchedule: {
            6: [2, 3]
        },
        timeRange: "11:00 AM - 2:00 PM (Wed), 11:00 AM - 5:00 PM (Sat)"
    },
    {
        name: "Dr. Ritesh Damle",
        days: [1, 4],
        slots: [1],
        timeRange: "8:00 AM - 11:00 AM"
    },
    {
        name: "Dr. Madhu Kabadge (Homeopath)",
        days: [2, 4],
        slots: [2],
        timeRange: "11:00 AM - 2:00 PM"
    },
    {
        name: "Dr. Prajakta Deshmukh (Gynacologist)",
        days: [3, 5],
        slots: [3],
        timeRange: "2:00 PM - 5:00 PM"
    },
    {
        name: "Dr. Chaitanya Bhujbal (GP)",
        days: [2, 3, 4],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM"
    },
    {
        name: "Dr. Apeksha Thakar (Ayurveda)",
        days: [1, 2, 3, 4, 5, 6],
        slots: [4],
        timeRange: "5:00 PM - 8:00 PM"
    },
    {
        name: "Mr. Rupak Marulkar (Yoga and Nutritionist)",
        days: [1, 2, 3, 4, 5],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM"
    }
];

let doctors = [];

// Load doctors from localStorage or use defaults
function loadDoctorsFromStorage() {
    const stored = localStorage.getItem('clinic_doctors');
    if (stored) {
        try {
            doctors = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading doctors:', e);
            doctors = [...DEFAULT_DOCTORS];
            saveDoctorsToStorage();
        }
    } else {
        doctors = [...DEFAULT_DOCTORS];
        saveDoctorsToStorage();
    }
}

// Save doctors to localStorage
function saveDoctorsToStorage() {
    localStorage.setItem('clinic_doctors', JSON.stringify(doctors));
}

// Add new doctor
function addDoctor(doctorData) {
    doctors.push(doctorData);
    saveDoctorsToStorage();
    renderDoctorsList();
    renderDashboard();
}

// Edit existing doctor
function editDoctor(index, doctorData) {
    doctors[index] = doctorData;
    saveDoctorsToStorage();
    renderDoctorsList();
    renderDashboard();
}

// Delete doctor
function deleteDoctor(index) {
    if (confirm(`Are you sure you want to delete ${doctors[index].name}?`)) {
        doctors.splice(index, 1);
        saveDoctorsToStorage();
        renderDoctorsList();
        renderDashboard();
    }
}

// Initialize doctors on load
loadDoctorsFromStorage();

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

// ===== RENDERING =====
function renderDashboard() {
    updateDateDisplay();
    renderDoctorSlots();
}

function updateDateDisplay() {
    document.getElementById('currentDateDisplay').textContent = formatDateForDisplay(selectedDate);
    document.getElementById('dayNameDisplay').textContent = getDayName(selectedDate);
}

function renderDoctorSlots() {
    const dayOfWeek = selectedDate.getDay();
    const dateKey = getDateKey(selectedDate);

    // Clear all slots
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`slot${i}`).innerHTML = '';
    }

    // Get doctors scheduled for this day
    const scheduledDoctors = doctors.filter(doctor => doctor.days.includes(dayOfWeek));

    if (scheduledDoctors.length === 0) {
        showEmptyState();
        return;
    }

    // Render doctors in their respective slots
    scheduledDoctors.forEach(doctor => {
        const doctorSlots = getDoctorSlotsForDay(doctor, dayOfWeek);

        doctorSlots.forEach(slotNum => {
            const slotContainer = document.getElementById(`slot${slotNum}`);
            const doctorCard = createDoctorCard(doctor, dateKey, slotNum);
            slotContainer.appendChild(doctorCard);
        });
    });

    // Show empty state for empty slots
    for (let i = 1; i <= 4; i++) {
        const slotContainer = document.getElementById(`slot${i}`);
        if (slotContainer.children.length === 0) {
            slotContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><p>No doctors scheduled</p></div>';
        }
    }
}

function getDoctorSlotsForDay(doctor, dayOfWeek) {
    // Check if doctor has special schedule for this day
    if (doctor.specialSchedule && doctor.specialSchedule[dayOfWeek]) {
        return doctor.specialSchedule[dayOfWeek];
    }
    return doctor.slots;
}

function createDoctorCard(doctor, dateKey, slotNum) {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.dataset.doctor = doctor.name;

    // Create unique key for this slot: DoctorName_SlotX
    const uniqueKey = `${doctor.name}_Slot${slotNum}`;

    // Check attendance using unique key ONLY
    const currentStatus = getAttendanceStatus(dateKey, uniqueKey);
    const attendanceInfo = getAttendanceInfo(dateKey, uniqueKey);
    const checkInTime = attendanceInfo.checkInTime || '';
    const checkOutTime = attendanceInfo.checkOutTime || '';

    card.innerHTML = `
        <div class="doctor-info">
            <div class="doctor-name">${doctor.name}</div>
            <div class="doctor-time">${doctor.timeRange}</div>
        </div>
        <div class="attendance-controls">
            <button class="attendance-btn ${currentStatus === 'present' ? 'present active' : 'present'}" 
                    data-unique-key="${uniqueKey}"
                    data-doctor="${doctor.name}" 
                    data-status="present"
                    data-slot="${slotNum}">
                Present
            </button>
            <button class="attendance-btn ${currentStatus === 'absent' ? 'absent active' : 'absent'}" 
                    data-unique-key="${uniqueKey}"
                    data-doctor="${doctor.name}" 
                    data-status="absent"
                    data-slot="${slotNum}">
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
                       data-doctor="${doctor.name}"
                       data-slot="${slotNum}"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
            <div class="time-input-group">
                <label>Check-Out</label>
                <input type="time" 
                       class="time-input check-out-input" 
                       value="${checkOutTime}"
                       data-unique-key="${uniqueKey}"
                       data-doctor="${doctor.name}"
                       data-slot="${slotNum}"
                       ${currentStatus !== 'present' ? 'disabled' : ''}>
            </div>
        </div>
    `;

    // Add click handlers directly to buttons
    const buttons = card.querySelectorAll('.attendance-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', handleAttendanceClick);
    });

    // Add time input handlers
    const checkInInput = card.querySelector('.check-in-input');
    const checkOutInput = card.querySelector('.check-out-input');

    checkInInput.addEventListener('change', handleTimeChange);
    checkOutInput.addEventListener('change', handleTimeChange);

    return card;
}

function showEmptyState() {
    const container = document.getElementById('slotsContainer');
    container.innerHTML = `
        <div class="empty-state" style="padding: 4rem; text-align: center;">
            <div class="empty-state-icon" style="font-size: 4rem;">🌙</div>
            <h3 style="margin: 1rem 0; font-size: 1.5rem;">Clinic Closed</h3>
            <p style="color: var(--text-secondary);">No doctors scheduled for ${getDayName(selectedDate)}</p>
        </div>
    `;
}

// ===== ATTENDANCE HANDLING =====
function handleAttendanceClick(event) {
    const button = event.currentTarget;
    const doctorName = button.dataset.doctor;
    const uniqueKey = button.dataset.uniqueKey; // DoctorName_SlotX
    const status = button.dataset.status;
    const slotNum = button.dataset.slot;
    const dateKey = getDateKey(selectedDate);

    // Find slot info
    const card = button.closest('.doctor-card');
    const slotContainer = card.closest('.doctors-grid');
    const slotSection = slotContainer.closest('.slot-section');
    const slotHeader = slotSection.querySelector('.slot-header h3').textContent;
    const slotTime = slotSection.querySelector('.slot-time').textContent;

    // Update attendance data
    if (!attendanceData[dateKey]) {
        attendanceData[dateKey] = {};
    }

    // Use unique key for storage
    const storageKey = uniqueKey;

    // Toggle: if clicking same status, remove it; otherwise set new status
    // Check if the current status matches the clicked status
    const currentData = attendanceData[dateKey][storageKey];
    const currentStatus = (currentData && currentData.status) ? currentData.status : currentData;

    if (currentStatus === status) {
        delete attendanceData[dateKey][storageKey];
    } else {
        attendanceData[dateKey][storageKey] = {
            status: status,
            timeSlot: slotTime,
            slotName: slotHeader,
            slotNumber: parseInt(slotNum),
            checkInTime: (currentData && currentData.checkInTime) || '',
            checkOutTime: (currentData && currentData.checkOutTime) || ''
        };
    }

    saveAttendanceData();
    renderDashboard(); // Re-render to update button states
}

function getAttendanceStatus(dateKey, key) {
    const data = attendanceData[dateKey]?.[key];
    // Handle both old format (string) and new format (object)
    if (typeof data === 'string') {
        return data;
    } else if (data && data.status) {
        return data.status;
    }
    return null;
}

function getAttendanceInfo(dateKey, key) {
    const data = attendanceData[dateKey]?.[key];
    if (data && typeof data === 'object') {
        return {
            status: data.status,
            checkInTime: data.checkInTime || '',
            checkOutTime: data.checkOutTime || ''
        };
    }
    return { status: null, checkInTime: '', checkOutTime: '' };
}

// Handle time input changes
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


// ===== DATA PERSISTENCE =====
const API_URL = 'http://localhost:3000/api';

async function loadAttendanceData() {
    try {
        const response = await fetch(`${API_URL}/attendance`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Failed to load attendance data');
            return {};
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        return {};
    }
}

async function saveAttendanceData() {
    const dateKey = getDateKey(selectedDate);
    const dateData = attendanceData[dateKey] || {};

    // Convert to backend format (flatten objects to just include necessary fields)
    const backendData = {};
    for (const [key, data] of Object.entries(dateData)) {
        if (typeof data === 'string') {
            // Old format, key is doctorName
            backendData[key] = data;
        } else {
            // New format, key is DoctorName_SlotX
            // The backend handles the composite key parsing
            backendData[key] = {
                status: data.status,
                timeSlot: data.timeSlot,
                slotNumber: data.slotNumber
            };
        }
    }

    try {
        const response = await fetch(`${API_URL}/attendance/${dateKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendData),
        });

        // DEBUG: Log what we are sending
        console.log('Saving attendance data:', backendData);

        if (!response.ok) {
            console.error('Failed to save attendance data');
        }
    } catch (error) {
        console.error('Error saving attendance data:', error);
    }
}

// ===== HISTORY MODAL =====
function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    const tableBody = document.getElementById('historyTableBody');

    tableBody.innerHTML = '';

    // Get all dates with attendance records, sorted newest first
    const dates = Object.keys(attendanceData).sort().reverse();

    if (dates.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No attendance records yet</td></tr>';
        modal.classList.add('active');
        return;
    }

    dates.forEach(dateKey => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getDay();
        const dayName = getDayName(date);
        const formattedDate = formatDateForDisplay(date);

        const records = attendanceData[dateKey];

        Object.entries(records).forEach(([doctorName, data]) => {
            // Handle both old format (string) and new format (object)
            let status, timeSlot;
            if (typeof data === 'string') {
                status = data;
                const doctor = doctors.find(d => d.name === doctorName);
                timeSlot = doctor ? doctor.timeRange : 'N/A';
            } else {
                status = data.status;
                timeSlot = data.timeSlot || data.slotName || 'N/A';
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${dayName}</td>
                <td>${doctorName}</td>
                <td>${timeSlot}</td>
                <td><span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            `;
            tableBody.appendChild(row);
        });
    });

    modal.classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
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
            a.download = `doctor-attendance-${formatDateForInput(new Date())}.csv`;
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Date input change
    document.getElementById('dateInput').addEventListener('change', async (e) => {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        attendanceData = await loadAttendanceData(); // Reload fresh data
        renderDashboard();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Tab Navigation

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

// ===== DATABASE VIEW =====
async function refreshDatabaseView() {
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Loading data...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/attendance/raw`);
        if (response.ok) {
            const records = await response.json();
            renderDatabaseTable(records);
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Failed to load records</td></tr>';
        }
    } catch (error) {
        console.error('Error loading raw data:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Error connecting to server</td></tr>';
    }
}

function renderDatabaseTable(records) {
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No records found in database</td></tr>';
        return;
    }

    records.forEach(record => {
        const row = document.createElement('tr');
        const date = new Date(record.date);
        const createdAt = new Date(record.createdAt);

        row.innerHTML = `
            <td>${formatDateForDisplay(date)}</td>
            <td style="font-weight: 500; color: var(--text-primary);">${record.doctorName}</td>
            <td><span class="status-badge ${record.status}">${record.status}</span></td>
            <td>${record.timeSlot || 'N/A'}</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${createdAt.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function getInitials(name) {
    if (!name) return 'DR';
    return name
        .replace('Dr. ', '')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}
