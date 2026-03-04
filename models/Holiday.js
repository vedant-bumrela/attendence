const mongoose = require('mongoose');

// Define Holiday Schema
const holidaySchema = new mongoose.Schema({
    date: {
        type: String,  // YYYY-MM-DD format
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
