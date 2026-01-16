const mongoose = require('mongoose');

// Define Employee Schema for configuration/management
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    standardHours: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['employee', 'other'],
        default: 'employee'
    },
    role: {
        type: String,
        default: 'Staff'
    },
    workTime: {
        type: String,
        default: 'N/A'
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
employeeSchema.index({ name: 1, type: 1 }, { unique: true });
employeeSchema.index({ type: 1 });
employeeSchema.index({ active: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
