const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');

const PORT = process.env.PORT || 3000;

const validRooms = new Set();
const roomUsersCount = {};

app.use(express.static('public'));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/new-room', (req, res) => {
    const roomId = uuidv4();
    validRooms.add(roomId);
    roomUsersCount[roomId] = 0;
    res.redirect(`/${roomId}`);
});

app.get('/:room', (req, res) => {
    const roomId = req.params.room;

    if (validRooms.has(roomId)) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).send('Room not found');
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.joinedRooms = [];

    socket.on('joinRoom', (room) => {
        if (validRooms.has(room)) {
            socket.join(room);
            socket.joinedRooms.push(room);

            roomUsersCount[room] = (roomUsersCount[room] || 0) + 1;
            console.log(`${socket.id} joined room: ${room}. Users in room: ${roomUsersCount[room]}`);
        } else {
            socket.disconnect();
            console.log(`Invalid room: ${room}, disconnecting ${socket.id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        socket.joinedRooms.forEach((room) => {
            if (roomUsersCount[room]) {
                roomUsersCount[room] -= 1;
                console.log(`User left room: ${room}. Users remaining: ${roomUsersCount[room]}`);

                if (roomUsersCount[room] <= 0) {
                    delete roomUsersCount[room];
                    validRooms.delete(room);
                    console.log(`Room ${room} deleted because it is now empty.`);
                }
            }
        });
    });

    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data;
        if (validRooms.has(room)) {
            console.log(`Broadcasting video URL to room ${room}: ${videoUrl}`);
            io.to(room).emit('videoUrl', videoUrl);
        } else {
            console.log(`Attempt to broadcast to invalid room: ${room}`);
        }
    });
});