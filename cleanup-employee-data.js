require('dotenv').config();
const mongoose = require('mongoose');
const EmployeeAttendance = require('./models/EmployeeAttendance');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';

async function cleanupEmployeeData() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n🗑️  Deleting all employee attendance records...');
        const result = await EmployeeAttendance.deleteMany({});

        console.log(`✅ Deleted ${result.deletedCount} employee attendance records`);
        console.log('\n✨ Cleanup complete! You can now start fresh with consistent employee names.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

cleanupEmployeeData();
