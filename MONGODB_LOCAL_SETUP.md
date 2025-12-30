# Local MongoDB Installation Guide for Windows

## Overview
This guide will help you install MongoDB locally on your Windows computer so all data is stored on your machine.

## Step 1: Download MongoDB

1. **Go to MongoDB Download Center**
   - Visit: https://www.mongodb.com/try/download/community
   
2. **Select Version**
   - Version: Latest (e.g., 7.x or 8.x)
   - Platform: Windows
   - Package: MSI
   
3. **Download**
   - Click "Download" button
   - File will be named like: `mongodb-windows-x86_64-7.x.x-signed.msi`

## Step 2: Install MongoDB

1. **Run the Installer**
   - Double-click the downloaded `.msi` file
   - Click "Next"

2. **Accept License Agreement**
   - Check "I accept the terms..."
   - Click "Next"

3. **Choose Setup Type**
   - Select "Complete" installation
   - Click "Next"

4. **Service Configuration**
   - ✅ Check "Install MongoDB as a Service"
   - Service Name: `MongoDB`
   - Data Directory: `C:\Program Files\MongoDB\Server\7.0\data\`
   - Log Directory: `C:\Program Files\MongoDB\Server\7.0\log\`
   - ✅ Check "Run service as Network Service user"
   - Click "Next"

5. **MongoDB Compass (Optional)**
   - Compass is a GUI for MongoDB
   - You can uncheck this to skip (speeds up installation)
   - Click "Next"

6. **Install**
   - Click "Install"
   - Wait for installation to complete (2-3 minutes)
   - Click "Finish"

## Step 3: Verify Installation

1. **Open Command Prompt**
   ```cmd
   mongod --version
   ```
   
2. **Should show version info like:**
   ```
   db version v7.0.x
   ```

## Step 4: Start MongoDB Service

MongoDB should start automatically. To verify:

```cmd
# Check if service is running
sc query MongoDB
```

Should show: `STATE: 4 RUNNING`

If not running, start it:
```cmd
net start MongoDB
```

## Step 5: Update Your Application

1. **Edit `.env` file** in your project:
   ```
   c:\Users\Admin\Desktop\Attendance\.env
   ```

2. **Change the connection string to:**
   ```
   MONGODB_URI=mongodb://localhost:27017/attendance
   PORT=3000
   ```

3. **Save the file**

## Step 6: Migrate Data (If Needed)

If you have existing data to migrate:

```cmd
cd c:\Users\Admin\Desktop\Attendance
node migrate.js
```

## Step 7: Start Your Server

```cmd
npm start
```

You should see:
```
✅ Connected to MongoDB
✅ Server is running on port 3000
```

---

## Troubleshooting

### "mongod is not recognized"

MongoDB might not be in your PATH. Either:

**Option 1: Add to PATH**
1. Search Windows for "Environment Variables"
2. Click "Environment Variables"
3. Under "System Variables", find "Path"
4. Click "Edit"
5. Click "New"
6. Add: `C:\Program Files\MongoDB\Server\7.0\bin`
7. Click "OK"
8. Restart Command Prompt

**Option 2: Use full path**
```cmd
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --version
```

### "MongoDB service won't start"

1. Check if port 27017 is already in use
2. Try manual start:
   ```cmd
   net start MongoDB
   ```

3. Check Windows Services:
   - Press Win+R
   - Type: `services.msc`
   - Find "MongoDB"
   - Right-click → Start

### "Connection failed"

- Ensure MongoDB service is running
- Check `.env` has correct connection string
- Verify port 27017 is not blocked by firewall

---

## Data Storage Location

Your MongoDB data is stored at:
```
C:\Program Files\MongoDB\Server\7.0\data\
```

**Backup this folder** to backup your database!

---

## Useful Commands

```cmd
# Start MongoDB service
net start MongoDB

# Stop MongoDB service
net stop MongoDB

# Check service status
sc query MongoDB

# Connect to MongoDB shell (if you installed it)
mongosh
```

---

## Accessing Your Data

### Using MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/try/download/compass
2. Connection string: `mongodb://localhost:27017`
3. Connect
4. View database: `attendance`
5. Collection: `attendances`

### Using MongoDB Shell
```cmd
mongosh

use attendance
db.attendances.find()
```

---

## Comparison: Local vs Atlas

| Feature | Local MongoDB | MongoDB Atlas |
|---------|--------------|---------------|
| **Location** | Your computer | Cloud |
| **Cost** | Free | Free tier available |
| **Internet** | Not required | Required |
| **Backup** | Manual | Automatic |
| **Access** | Local network only | Anywhere |
| **Performance** | Fast (local) | Depends on internet |

---

## Next Steps

1. ✅ Install MongoDB Community Server
2. ✅ Verify service is running
3. ✅ Update `.env` file with local connection
4. ✅ Run migration (if needed)
5. ✅ Start your application

---

**Your data will now be stored locally on your computer at:**
`C:\Program Files\MongoDB\Server\7.0\data\attendance`
