// Migration script to transfer data from JSON file to MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Attendance = require('./models/Attendance');

const DATA_FILE = path.join(__dirname, 'attendance-data.json');

async function migrateData() {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in .env file');
            console.log('Please create a .env file with your MongoDB connection string');
            process.exit(1);
        }

        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Read JSON file
        if (!fs.existsSync(DATA_FILE)) {
            console.log('⚠️  No attendance-data.json found. Nothing to migrate.');
            await mongoose.connection.close();
            return;
        }

        console.log('📂 Reading attendance-data.json...');
        const jsonData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        // Convert to MongoDB format
        const records = [];
        for (const [date, doctors] of Object.entries(jsonData)) {
            for (const [doctorName, status] of Object.entries(doctors)) {
                records.push({
                    date,
                    doctorName,
                    status
                });
            }
        }

        if (records.length === 0) {
            console.log('⚠️  No records found in JSON file.');
            await mongoose.connection.close();
            return;
        }

        console.log(`📊 Found ${records.length} attendance records`);

        // Clear existing data in MongoDB (optional - comment out to keep existing)
        console.log('🗑️  Clearing existing MongoDB data...');
        await Attendance.deleteMany({});

        // Insert records
        console.log('💾 Migrating to MongoDB...');
        await Attendance.insertMany(records);

        console.log('✅ Migration complete!\n');
        console.log(`📈 Migrated ${records.length} attendance records to MongoDB`);

        // Backup JSON file
        const backupFile = DATA_FILE.replace('.json', '_backup.json');
        fs.copyFileSync(DATA_FILE, backupFile);
        console.log(`💾 Backed up JSON file to: ${backupFile}`);

        await mongoose.connection.close();
        console.log('\n✅ Done! You can now start the server with: npm start');

    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
migrateData();
