# Doctor Attendance Dashboard - Setup Instructions

## Quick Start Guide

### Prerequisites
- **Node.js** must be installed on your computer
- Check if you have it: Open PowerShell and type `node --version`
- If not installed, download from: https://nodejs.org/

### Installation Steps

1. **Open PowerShell/Command Prompt**
   - Navigate to the project folder:
   ```powershell
   cd c:\Users\Admin\Desktop\Attendance
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Start the Server**
   ```powershell
   npm start
   ```

4. **Access the Dashboard**
   - Open your browser and go to: `http://localhost:3000`
   - The dashboard will load automatically

### Allowing Others to Access

#### On Same Network (Local Clinic)

1. **Find Your IP Address**
   ```powershell
   ipconfig
   ```
   - Look for "IPv4 Address" (e.g., 192.168.1.100)

2. **Share the URL**
   - Give others: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`
   - They can access from any device on the same network

3. **Keep Server Running**
   - Leave PowerShell window open
   - Server must run for others to access
   - Press `Ctrl+C` to stop

#### On Internet (Public Access)

For internet access, you'll need to:
1. Set up port forwarding on your router (Port 3000)
2. Use your public IP address or dynamic DNS
3. Consider security implications (add authentication)

**Recommended**: For production use, consider:
- Deploy to cloud service (Heroku, DigitalOcean, AWS)
- Use proper database (MySQL, MongoDB)
- Add user authentication

### Data Storage

- All attendance data is stored in: `attendance-data.json`
- This file is created automatically in the project folder
- **Backup this file regularly** to prevent data loss
- You can also use the "Export Data" button to download CSV backups

### Troubleshooting

**Server won't start?**
- Make sure Node.js is installed
- Check if port 3000 is already in use
- Try running: `npm install` again

**Can't connect from other devices?**
- Check firewall settings
- Make sure server is running
- Verify you're on the same network
- Try disabling Windows Firewall temporarily

**Data not saving?**
- Check server console for errors
- Ensure `attendance-data.json` is writable
- Check browser console (F12) for error messages

### Stopping the Server

- In the PowerShell window, press `Ctrl+C`
- Or simply close the PowerShell window

---

## Commands Summary

```powershell
# Install dependencies (first time only)
npm install

# Start server
npm start

# Find your IP address
ipconfig

# Check Node.js version
node --version
```

---

## File Structure

```
c:\Users\Admin\Desktop\Attendance\
├── index.html              # Main dashboard HTML
├── style.css               # Styling
├── script.js               # Frontend JavaScript
├── server.js               # Backend server
├── package.json            # Dependencies
├── attendance-data.json    # Data storage (auto-created)
└── README.md              # This file
```

---

## Next Steps

1. Start the server: `npm start`
2. Open browser: `http://localhost:3000`
3. Share network URL with clinic staff
4. Mark daily attendance
5. Export backups regularly
