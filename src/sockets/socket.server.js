const socket  = require('socket.io');

function initSocketServer(httpServer) {
    const io = socket(httpServer, {});

    io.on('connection', (socket) => {
        console.log('New client connected: ' + socket.id);
    });

    return io;
}

module.exports = initSocketServer;