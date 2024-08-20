const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const connectedUsers = [];

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    connectedUsers[socket.id] = {
        id: socket.id,
    };

    socket.on('videoUrl', (videoUrl) => {
        console.log('Broadcasting video URL:', videoUrl);
        
        io.emit('videoUrl', videoUrl);
    });

    socket.on('disconnect', () => {
        console.log(`User connected: ${socket.id}`);
        delete connectedUsers[socket.id];
    });
});
