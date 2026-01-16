const mongoose = require('mongoose');

// Define Doctor Attendance Schema
const doctorAttendanceSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        index: true
    },
    doctorName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    },
    timeSlot: {
        type: String
    },
    slotNumber: {
        type: Number
    },
    slotName: {
        type: String
    },
    checkInTime: {
        type: String  // HH:MM format, e.g., "08:30"
    },
    checkOutTime: {
        type: String  // HH:MM format, e.g., "14:00"
    },
    cabinNumber: {
        type: Number,
        min: 1,
        max: 9,
        sparse: true  // Allow null for records without cabin assignment
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for efficient querying and enforcing uniqueness per slot
doctorAttendanceSchema.index({ date: 1, doctorName: 1, slotNumber: 1 }, { unique: true });

// Create model - collection name will be 'doctorattendances'
const DoctorAttendance = mongoose.model('DoctorAttendance', doctorAttendanceSchema);

module.exports = DoctorAttendance;
