require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const DoctorAttendance = require('./models/DoctorAttendance');
const EmployeeAttendance = require('./models/EmployeeAttendance');
const Doctor = require('./models/Doctor');
const Employee = require('./models/Employee');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public folder

// Employee list with standard working hours
const employees = [
    { name: "Ms. Shreya Talekar", standardHours: 6 },
    { name: "Ms. Aditi Deshpande", standardHours: 6 },
    { name: "Mr. Vedant Bumrela", standardHours: 3 },
    { name: "Dr. Rajendra Tippanwar", standardHours: 6 },
    { name: "Ms. Anuradha Sapkal", standardHours: 7 }  // Other staff - for analytics
];

// Helper: Calculate overtime hours
function calculateOvertimeHours(checkInTime, checkOutTime, standardHours) {
    if (!checkInTime || !checkOutTime) return 0;

    const [inHour, inMin] = checkInTime.split(':').map(Number);
    const [outHour, outMin] = checkOutTime.split(':').map(Number);

    const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    const hoursWorked = totalMinutes / 60;
    const overtime = Math.max(0, hoursWorked - standardHours);

    return parseFloat(overtime.toFixed(2));
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        // DROP LEGACY INDEX if it exists to allow multiple slots per doctor
        try {
            await mongoose.model('DoctorAttendance').collection.dropIndex('date_1_doctorName_1');
            console.log('Dropped legacy unique index (date_doctor) to allow multi-slot attendance.');
        } catch (e) {
            // Index might not exist, which is fine
        }

        // Also ensure any other conflicting indexes are removed if needed relative to schema changes
        try {
            await mongoose.syncIndexes();
        } catch (e) {
            console.log('Index sync error (usually fine during migration):', e.message);
        }

        // Seed default data if collections are empty
        await seedDoctors();
        await seedEmployees();
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Helper function to convert MongoDB docs to old JSON format
// Helper function to convert MongoDB docs to JSON format expected by frontend
// Helper function to convert MongoDB docs to JSON format expected by frontend
function formatDoctorAttendanceData(records) {
    const formatted = {};
    records.forEach(record => {
        if (!formatted[record.date]) {
            formatted[record.date] = {};
        }

        // Parse slot number if available
        let key = record.doctorName;
        if (record.slotNumber) {
            key = `${record.doctorName}_Slot${record.slotNumber}`;
        }

        // Debug log to ensure keys are created correctly
        // console.log(`Formatting: ${record.doctorName} -> ${key} (Slot: ${record.slotNumber})`);

        // Return object structure that frontend expects
        formatted[record.date][key] = {
            status: record.status,
            timeSlot: record.timeSlot,
            slotNumber: record.slotNumber,
            checkInTime: record.checkInTime || '',
            checkOutTime: record.checkOutTime || '',
            cabinNumber: record.cabinNumber || null
        };
    });
    return formatted;
}

// API Routes

// Get all attendance data
app.get('/api/attendance', async (req, res) => {
    try {
        const records = await DoctorAttendance.find();
        const formatted = formatDoctorAttendanceData(records);
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
});

// NEW: Get raw attendance records (sorted by date desc)
app.get('/api/attendance/raw', async (req, res) => {
    try {
        const records = await DoctorAttendance.find().sort({ date: -1, createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error fetching raw attendance:', error);
        res.status(500).json({ error: 'Failed to fetch raw data' });
    }
});

// Get attendance for a specific date
app.get('/api/attendance/:date', async (req, res) => {
    try {
        const records = await DoctorAttendance.find({ date: req.params.date });
        const formatted = {};
        records.forEach(record => {
            formatted[record.doctorName] = record.status;
        });
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching date attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Get cabin availability for a specific date and slot
app.get('/api/cabins/availability/:date/:slot', async (req, res) => {
    try {
        const { date, slot } = req.params;
        const slotNumber = parseInt(slot);

        // Find all occupied cabins for this date and slot
        const occupiedRecords = await DoctorAttendance.find({
            date,
            slotNumber,
            cabinNumber: { $ne: null }
        });

        const occupiedCabins = occupiedRecords.map(record => record.cabinNumber);

        // All cabins 1-9
        const allCabins = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const availableCabins = allCabins.filter(cabin => !occupiedCabins.includes(cabin));

        res.json({
            occupied: occupiedCabins,
            available: availableCabins,
            total: 9
        });
    } catch (error) {
        console.error('Error fetching cabin availability:', error);
        res.status(500).json({ error: 'Failed to fetch cabin availability' });
    }
});


// Save/Update attendance for a specific date
app.post('/api/attendance/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const attendanceData = req.body;

        console.log('Received attendance data:', JSON.stringify(attendanceData, null, 2));

        // Delete existing records for this date
        await DoctorAttendance.deleteMany({ date });

        // Insert new records
        // Insert new records
        const records = Object.entries(attendanceData).map(([key, data]) => {
            // Check if key is composite (DoctorName_SlotID)
            const isComposite = key.includes('_Slot');
            const doctorName = isComposite ? key.split('_Slot')[0] : key;
            const slotNumber = isComposite ? parseInt(key.split('_Slot')[1]) : null;

            // Handle both old format (string) and new format (object)
            if (typeof data === 'string') {
                return {
                    date,
                    doctorName,
                    status: data,
                    timeSlot: 'N/A',
                    slotNumber,
                    checkInTime: '',
                    checkOutTime: '',
                    cabinNumber: null
                };
            } else {
                return {
                    date,
                    doctorName,
                    status: data.status,
                    timeSlot: data.timeSlot || 'N/A',
                    slotNumber: data.slotNumber || slotNumber,
                    checkInTime: data.checkInTime || '',
                    checkOutTime: data.checkOutTime || '',
                    cabinNumber: data.cabinNumber || null
                };
            }
        });

        if (records.length > 0) {
            await DoctorAttendance.insertMany(records);
        }

        res.json({ success: true, message: 'DoctorAttendance saved successfully' });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({ success: false, message: 'Error saving data' });
    }
});

// Update single doctor's attendance
app.put('/api/attendance/:date/:doctor', async (req, res) => {
    try {
        const { date, doctor } = req.params;
        const { status } = req.body;

        if (status === null || status === undefined) {
            // Delete the record
            await DoctorAttendance.deleteOne({ date, doctorName: doctor });
        } else {
            // Upsert (update or insert)
            await DoctorAttendance.findOneAndUpdate(
                { date, doctorName: doctor },
                { date, doctorName: doctor, status },
                { upsert: true, new: true }
            );
        }

        res.json({ success: true, message: 'Attendance updated successfully' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ success: false, message: 'Error updating data' });
    }
});

// Export data as CSV
app.get('/api/export/csv', async (req, res) => {
    try {
        const records = await DoctorAttendance.find().sort({ date: 1 });
        const csvRows = [];

        // Header
        csvRows.push(['Date', 'Day', 'Doctor Name', 'Status', 'Time Slot']);

        records.forEach(record => {
            const date = new Date(record.date);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = days[date.getDay()];
            const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            csvRows.push([
                formattedDate,
                dayName,
                record.doctorName,
                record.status.charAt(0).toUpperCase() + record.status.slice(1),
                record.timeSlot || 'N/A'
            ]);
        });

        // Convert to CSV string
        const csvContent = csvRows.map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// ===== NO SHOW REPORT ENDPOINT =====
// Get all absent doctor records for a date range
app.get('/api/doctors/noshow-report', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Find all absent records in the date range
        const records = await DoctorAttendance.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'absent'
        }).sort({ date: 1, doctorName: 1 });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const slotNames = {
            1: 'S1 (8:00 AM - 11:00 AM)',
            2: 'S2 (11:00 AM - 2:00 PM)',
            3: 'S3 (2:00 PM - 5:00 PM)',
            4: 'S4 (5:00 PM - 8:00 PM)'
        };

        // Format the response
        const report = records.map((record, index) => {
            const date = new Date(record.date);
            const dayName = days[date.getDay()];
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            return {
                srNo: index + 1,
                dayDate: `${dayName}, ${formattedDate}`,
                doctorName: record.doctorName,
                absentSlot: record.slotNumber ? slotNames[record.slotNumber] : (record.timeSlot || 'N/A'),
                remark: record.remark || ''
            };
        });

        res.json({
            totalAbsences: report.length,
            dateRange: { start: startDate, end: endDate },
            records: report
        });

    } catch (error) {
        console.error('Error generating no-show report:', error);
        res.status(500).json({ error: 'Failed to generate no-show report' });
    }
});

// Export No Show Report as CSV
app.get('/api/doctors/noshow-report/csv', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const records = await DoctorAttendance.find({
            date: { $gte: startDate, $lte: endDate },
            status: 'absent'
        }).sort({ date: 1, doctorName: 1 });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const slotNames = {
            1: 'S1 (8:00 AM - 11:00 AM)',
            2: 'S2 (11:00 AM - 2:00 PM)',
            3: 'S3 (2:00 PM - 5:00 PM)',
            4: 'S4 (5:00 PM - 8:00 PM)'
        };

        const csvRows = [];
        // Header
        csvRows.push(['Sr. #', 'Day & Date', 'Doctor Name', 'Absent Slot', 'Remark']);

        records.forEach((record, index) => {
            const date = new Date(record.date);
            const dayName = days[date.getDay()];
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            csvRows.push([
                index + 1,
                `${dayName}, ${formattedDate}`,
                record.doctorName,
                record.slotNumber ? slotNames[record.slotNumber] : (record.timeSlot || 'N/A'),
                record.remark || ''
            ]);
        });

        const csvContent = csvRows.map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="noshow-report-${startDate}-to-${endDate}.csv"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting no-show CSV:', error);
        res.status(500).json({ error: 'Failed to export no-show report' });
    }
});

// ===== EMPLOYEE ATTENDANCE ENDPOINTS =====

// Helper function to format employee attendance data
function formatEmployeeAttendanceData(records) {
    const formattedData = {};

    records.forEach(record => {
        const dateKey = record.date;
        if (!formattedData[dateKey]) {
            formattedData[dateKey] = {};
        }

        const uniqueKey = `${record.employeeName}_Slot${record.slotNumber}`;
        formattedData[dateKey][uniqueKey] = {
            status: record.status,
            timeSlot: record.timeSlot,
            slotName: record.timeSlot, // For compatibility
            slotNumber: record.slotNumber,
            checkInTime: record.checkInTime || '',
            checkOutTime: record.checkOutTime || ''
        };
    });

    return formattedData;
}

// Get all employee attendance data
app.get('/api/employees/attendance', async (req, res) => {
    try {
        const records = await EmployeeAttendance.find();
        const formatted = formatEmployeeAttendanceData(records);
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching employee attendance:', error);
        res.status(500).json({ error: 'Failed to fetch employee attendance data' });
    }
});

// Get raw employee attendance records
app.get('/api/employees/attendance/raw', async (req, res) => {
    try {
        const records = await EmployeeAttendance.find().sort({ date: -1, createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error fetching raw employee attendance:', error);
        res.status(500).json({ error: 'Failed to fetch raw employee data' });
    }
});

// Get employee attendance for a specific date
app.get('/api/employees/attendance/:date', async (req, res) => {
    try {
        const records = await EmployeeAttendance.find({ date: req.params.date });
        const formatted = {};

        records.forEach(record => {
            const uniqueKey = `${record.employeeName}_Slot${record.slotNumber}`;
            formatted[uniqueKey] = {
                status: record.status,
                timeSlot: record.timeSlot,
                slotName: record.timeSlot,
                slotNumber: record.slotNumber,
                checkInTime: record.checkInTime || '',
                checkOutTime: record.checkOutTime || ''
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching employee attendance for date:', error);
        res.status(500).json({ error: 'Failed to fetch employee attendance data' });
    }
});

// Save employee attendance for a specific date
app.post('/api/employees/attendance/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const attendanceData = req.body;

        // Delete existing records for this date
        await EmployeeAttendance.deleteMany({ date });

        // Insert new records
        const recordsToInsert = [];
        for (const [key, data] of Object.entries(attendanceData)) {
            // Extract employee name from key (format: "EmployeeName_SlotX")
            const employeeName = key.substring(0, key.lastIndexOf('_Slot'));

            // Find employee to get standard hours
            const employee = employees.find(emp => emp.name === employeeName);
            const standardHours = employee ? employee.standardHours : 6; // Default to 6 if not found

            // Calculate overtime
            const overtimeHours = calculateOvertimeHours(
                data.checkInTime || '',
                data.checkOutTime || '',
                standardHours
            );

            recordsToInsert.push({
                date,
                employeeName,
                status: data.status,
                timeSlot: data.timeSlot || data.slotName,
                slotNumber: data.slotNumber,
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || '',
                overtimeHours: overtimeHours
            });
        }

        if (recordsToInsert.length > 0) {
            await EmployeeAttendance.insertMany(recordsToInsert);
        }

        res.json({ success: true, message: 'Employee attendance saved successfully' });
    } catch (error) {
        console.error('Error saving employee attendance:', error);
        res.status(500).json({ error: 'Failed to save employee attendance data' });
    }
});

// Export employee attendance to CSV
app.get('/api/employees/export/csv', async (req, res) => {
    try {
        const records = await EmployeeAttendance.find().sort({ date: -1, employeeName: 1 });

        const rows = [
            ['Date', 'Employee Name', 'Status', 'Time Slot', 'Check-In Time', 'Check-Out Time', 'Recorded At']
        ];

        records.forEach(record => {
            rows.push([
                record.date,
                record.employeeName,
                record.status,
                record.timeSlot || 'N/A',
                record.checkInTime || 'N/A',
                record.checkOutTime || 'N/A',
                new Date(record.createdAt).toLocaleString()
            ]);
        });

        const csvContent = rows.map(row =>
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="employee-attendance-export-' + new Date().toISOString().split('T')[0] + '.csv"');
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting employee CSV:', error);
        res.status(500).json({ error: 'Failed to export employee data' });
    }
});

// ===== EMPLOYEE ANALYTICS ENDPOINT =====
app.get('/api/employees/analytics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Calculate total working days (excluding Sundays)
        const start = new Date(startDate);
        const end = new Date(endDate);
        let totalWorkingDays = 0;
        let current = new Date(start);

        while (current <= end) {
            if (current.getDay() !== 0) { // Not Sunday
                totalWorkingDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        // Get all employee records in date range
        const records = await EmployeeAttendance.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Calculate unique dates with records
        const uniqueDates = [...new Set(records.map(r => r.date))];
        const totalRecordedDays = uniqueDates.length;

        // Group by employee and calculate statistics
        const employeeStats = {};

        employees.forEach(emp => {
            employeeStats[emp.name] = {
                name: emp.name,
                presentDays: new Set(),
                absentDays: new Set(),
                totalSlotAttendances: 0,
                totalOvertimeHours: 0
            };
        });

        // Process records
        records.forEach(record => {
            const empName = record.employeeName;
            if (!employeeStats[empName]) {
                employeeStats[empName] = {
                    name: empName,
                    presentDays: new Set(),
                    absentDays: new Set(),
                    totalSlotAttendances: 0,
                    totalOvertimeHours: 0
                };
            }

            if (record.status === 'present') {
                employeeStats[empName].presentDays.add(record.date);
                employeeStats[empName].totalSlotAttendances++;

                // Add overtime hours
                if (record.overtimeHours) {
                    employeeStats[empName].totalOvertimeHours += record.overtimeHours;
                }
            } else if (record.status === 'absent') {
                employeeStats[empName].absentDays.add(record.date);
            }
        });

        // Convert to array and calculate final stats
        const employeeList = Object.values(employeeStats).map(emp => {
            const presentDaysCount = emp.presentDays.size;
            const absentDaysCount = emp.absentDays.size;
            const attendanceRate = totalWorkingDays > 0
                ? ((presentDaysCount / totalWorkingDays) * 100).toFixed(2)
                : 0;

            return {
                name: emp.name,
                presentDays: presentDaysCount,
                absentDays: absentDaysCount,
                attendanceRate: parseFloat(attendanceRate),
                totalSlotAttendances: emp.totalSlotAttendances,
                totalOvertimeHours: parseFloat(emp.totalOvertimeHours.toFixed(2))
            };
        });

        // Sort by name
        employeeList.sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            totalWorkingDays,
            totalRecordedDays,
            dateRange: {
                start: startDate,
                end: endDate
            },
            employees: employeeList
        });

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'Server is running',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

// ===== DOCTOR CONFIGURATION ENDPOINTS =====

// Default doctors (used for initial seeding)
const DEFAULT_DOCTORS = [
    {
        name: "Dr. Rajendra Tippanawar (GP)",
        days: [1, 2, 3, 4, 5, 6],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Maneesha Mhamane-Atre (Homeopath)",
        days: [3, 6],
        slots: [2],
        specialSchedule: { 6: [2, 3] },
        timeRange: "11:00 AM - 2:00 PM (Wed), 11:00 AM - 5:00 PM (Sat)",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Ritesh Damle",
        days: [1, 4],
        slots: [1],
        timeRange: "8:00 AM - 11:00 AM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Madhu Kabadge (Homeopath)",
        days: [2, 4],
        slots: [2],
        timeRange: "11:00 AM - 2:00 PM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Prajakta Deshmukh (Gynacologist)",
        days: [3, 5],
        slots: [3],
        timeRange: "2:00 PM - 5:00 PM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Chaitanya Bhujbal (GP)",
        days: [2, 3, 4],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Dr. Apeksha Thakar (Ayurveda)",
        days: [1, 2, 3, 4, 5, 6],
        slots: [4],
        timeRange: "5:00 PM - 8:00 PM",
        joiningDate: "2024-01-01",
        active: true
    },
    {
        name: "Mr. Rupak Marulkar (Yoga and Nutritionist)",
        days: [1, 2, 3, 4, 5],
        slots: [2, 3],
        timeRange: "11:00 AM - 5:00 PM",
        joiningDate: "2024-01-01",
        active: true
    }
];

// Default employees (used for initial seeding)
const DEFAULT_EMPLOYEES = [
    { name: "Ms. Shreya Talekar", standardHours: 6, type: "employee" },
    { name: "Ms. Aditi Deshpande", standardHours: 6, type: "employee" },
    { name: "Mr. Vedant Bumrela", standardHours: 3, type: "employee" },
    { name: "Dr. Rajendra Tippanwar", standardHours: 6, type: "employee" },
    { name: "Ms. Anuradha Sapkal", standardHours: 7, type: "other", role: "Maid", workTime: "10:00 AM - 5:00 PM" }
];

// Seed doctors if collection is empty
async function seedDoctors() {
    try {
        const count = await Doctor.countDocuments();
        if (count === 0) {
            await Doctor.insertMany(DEFAULT_DOCTORS);
            console.log('✅ Seeded default doctors to database');
        }
    } catch (error) {
        console.error('Error seeding doctors:', error.message);
    }
}

// Seed employees if collection is empty
async function seedEmployees() {
    try {
        const count = await Employee.countDocuments();
        if (count === 0) {
            await Employee.insertMany(DEFAULT_EMPLOYEES);
            console.log('✅ Seeded default employees to database');
        }
    } catch (error) {
        console.error('Error seeding employees:', error.message);
    }
}

// Get all doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find().sort({ name: 1 });
        res.json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// Create new doctor
app.post('/api/doctors', async (req, res) => {
    try {
        const doctor = new Doctor(req.body);
        await doctor.save();
        res.status(201).json({ success: true, doctor });
    } catch (error) {
        console.error('Error creating doctor:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Doctor with this name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create doctor' });
        }
    }
});

// Update doctor by ID
app.put('/api/doctors/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json({ success: true, doctor });
    } catch (error) {
        console.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Failed to update doctor' });
    }
});

// Delete doctor by ID
app.delete('/api/doctors/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json({ success: true, message: 'Doctor deleted' });
    } catch (error) {
        console.error('Error deleting doctor:', error);
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
});

// ===== STAFF CONFIGURATION ENDPOINTS =====

// Get all staff (employees + other)
app.get('/api/staff', async (req, res) => {
    try {
        const staff = await Employee.find().sort({ type: 1, name: 1 });
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Create new staff member
app.post('/api/staff', async (req, res) => {
    try {
        const staff = new Employee(req.body);
        await staff.save();
        res.status(201).json({ success: true, staff });
    } catch (error) {
        console.error('Error creating staff:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Staff member with this name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create staff member' });
        }
    }
});

// Update staff by ID
app.put('/api/staff/:id', async (req, res) => {
    try {
        const staff = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// Delete staff by ID
app.delete('/api/staff/:id', async (req, res) => {
    try {
        const staff = await Employee.findByIdAndDelete(req.params.id);
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json({ success: true, message: 'Staff member deleted' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ error: 'Failed to delete staff member' });
    }
});

// ===== COUNTS ENDPOINT (for home page) =====
app.get('/api/counts', async (req, res) => {
    try {
        const doctorCount = await Doctor.countDocuments({ active: true });
        const employeeCount = await Employee.countDocuments({ type: 'employee', active: { $ne: false } });
        const otherStaffCount = await Employee.countDocuments({ type: 'other', active: { $ne: false } });

        res.json({
            doctors: doctorCount,
            employees: employeeCount,
            otherStaff: otherStaffCount
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('\n🏥 Doctor Attendance Dashboard Server');
    console.log('=====================================');
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🗄️  Database: MongoDB Atlas`);
    console.log('\n📍 Access the dashboard at:');
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://YOUR_IP_ADDRESS:${PORT}`);
    console.log('\n💡 To find your IP address, run: ipconfig (Windows) or ifconfig (Mac/Linux)');
    console.log('   Share the Network URL with others on your network to allow access.\n');
    console.log('Press Ctrl+C to stop the server.\n');
});
