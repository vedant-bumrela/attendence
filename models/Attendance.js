const mongoose = require('mongoose');

// Define Attendance Schema
const attendanceSchema = new mongoose.Schema({
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
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for efficient querying and enforcing uniqueness per slot
attendanceSchema.index({ date: 1, doctorName: 1, slotNumber: 1 }, { unique: true });

// Create model
const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
