const mongoose = require('mongoose');

// Define Doctor Schema for configuration/management
const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    days: [{
        type: Number,
        min: 0,
        max: 6
    }],
    slots: [{
        type: Number,
        min: 1,
        max: 4
    }],
    specialSchedule: {
        type: Object,
        default: {}
    },
    timeRange: {
        type: String
    },
    joiningDate: {
        type: String
    },
    cabinNumber: {
        type: Number,
        min: 1,
        max: 9,
        sparse: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
doctorSchema.index({ name: 1 }, { unique: true });
doctorSchema.index({ active: 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
