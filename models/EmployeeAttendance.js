const mongoose = require('mongoose');

// Define Employee Attendance Schema
const employeeAttendanceSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        index: true
    },
    employeeName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    },
    timeSlot: {
        type: String  // e.g., "8:00 AM - 2:00 PM"
    },
    slotNumber: {
        type: Number  // 1-4 for the four employee shifts
    },
    checkInTime: {
        type: String  // HH:MM format, e.g., "08:30"
    },
    checkOutTime: {
        type: String  // HH:MM format, e.g., "14:00"
    },
    overtimeHours: {
        type: Number,  // Calculated overtime hours (decimal)
        default: 0
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for efficient querying and enforcing uniqueness per slot
employeeAttendanceSchema.index({ date: 1, employeeName: 1, slotNumber: 1 }, { unique: true });

// Create model
const EmployeeAttendance = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);

module.exports = EmployeeAttendance;
