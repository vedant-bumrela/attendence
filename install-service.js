var Service = require('node-windows').Service;
var svc = new Service({
    name: 'Attendance System',
    description: 'Clinic Attendance Management System',
    script: 'C:\\Users\\Admin\\Desktop\\attendence\\server.js'
});
svc.on('install', function () {
    svc.start();
});
svc.install();