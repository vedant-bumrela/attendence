var Service = require('node-windows').Service;

var svc = new Service({
    name: 'Attendance System',
    script: require('path').join(__dirname, 'server.js')
});

svc.on('uninstall', function () {
    console.log('Service uninstalled successfully!');
    console.log('You can now run "node install-service.js" to reinstall with updated code.');
});

svc.uninstall();
