require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const EmployeeAttendance = require('./models/EmployeeAttendance');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// Employee list
const employees = [
    { name: "Shreya Talekar" },
    { name: "Aditi Deshpande" },
    { name: "Vedant Bumrela" },
    { name: "Dr. Rajendra Tippanwar" }
];

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        // DROP LEGACY INDEX if it exists to allow multiple slots per doctor
        try {
            await mongoose.model('Attendance').collection.dropIndex('date_1_doctorName_1');
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
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Helper function to convert MongoDB docs to old JSON format
// Helper function to convert MongoDB docs to JSON format expected by frontend
// Helper function to convert MongoDB docs to JSON format expected by frontend
function formatAttendanceData(records) {
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
            slotNumber: record.slotNumber
        };
    });
    return formatted;
}

// API Routes

// Get all attendance data
app.get('/api/attendance', async (req, res) => {
    try {
        const records = await Attendance.find();
        const formatted = formatAttendanceData(records);
        res.json(formatted);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
});

// NEW: Get raw attendance records (sorted by date desc)
app.get('/api/attendance/raw', async (req, res) => {
    try {
        const records = await Attendance.find().sort({ date: -1, createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error fetching raw attendance:', error);
        res.status(500).json({ error: 'Failed to fetch raw data' });
    }
});

// Get attendance for a specific date
app.get('/api/attendance/:date', async (req, res) => {
    try {
        const records = await Attendance.find({ date: req.params.date });
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

// Save/Update attendance for a specific date
app.post('/api/attendance/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const attendanceData = req.body;

        console.log('Received attendance data:', JSON.stringify(attendanceData, null, 2));

        // Delete existing records for this date
        await Attendance.deleteMany({ date });

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
                    slotNumber
                };
            } else {
                return {
                    date,
                    doctorName,
                    status: data.status,
                    timeSlot: data.timeSlot || 'N/A',
                    slotNumber: data.slotNumber || slotNumber
                };
            }
        });

        if (records.length > 0) {
            await Attendance.insertMany(records);
        }

        res.json({ success: true, message: 'Attendance saved successfully' });
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
            await Attendance.deleteOne({ date, doctorName: doctor });
        } else {
            // Upsert (update or insert)
            await Attendance.findOneAndUpdate(
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
        const records = await Attendance.find().sort({ date: 1 });
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

            recordsToInsert.push({
                date,
                employeeName,
                status: data.status,
                timeSlot: data.timeSlot || data.slotName,
                slotNumber: data.slotNumber,
                checkInTime: data.checkInTime || '',
                checkOutTime: data.checkOutTime || ''
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
        res.setHeader('Content-Disposition', `attachment; filename=\"employee-attendance-export-${new Date().toISOString().split('T')[0]}.csv\"`);
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
                overtimeDays: 0,
                totalSlotAttendances: 0
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
                    overtimeDays: 0,
                    totalSlotAttendances: 0
                };
            }

            if (record.status === 'present') {
                employeeStats[empName].presentDays.add(record.date);
                employeeStats[empName].totalSlotAttendances++;

                // Check if this is overtime (slot 4)
                if (record.slotNumber === 4) {
                    employeeStats[empName].overtimeDays++;
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
                overtimeDays: emp.overtimeDays,
                attendanceRate: parseFloat(attendanceRate),
                totalSlotAttendances: emp.totalSlotAttendances
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
