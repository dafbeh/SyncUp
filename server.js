const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');

// Configure the server
const PORT = process.env.PORT || 3000;

// Store the information about the rooms
const validRooms = new Set();
const roomLeader = {};
const roomModerators = {};
const roomUserList = {};

app.use(express.static('public'));

// Start the server
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});

// Routes 
app.get('/new-room', (req, res) => {
    const roomId = uuidv4();
    validRooms.add(roomId);
    roomUserList[roomId] = [];
    roomModerators[roomId] = [];
    res.redirect(`/${roomId}`);
});

// Route to join a room
app.get('/:room', (req, res) => {
    const roomId = req.params.room;

    if (validRooms.has(roomId)) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).send('Room not found');
    }
});

// WebSocket server connection
io.on('connection', (socket) => {
    socket.joinedRooms = [];

    socket.on('joinRoom', (room) => {
        if(validRooms.has(room)) {
            socket.join(room);
            socket.joinedRooms.push(room);

            if (roomUserList[room].length === 0) {
                roomLeader[room] = socket.id;
            }

            roomUserList[room].push(socket.id);
            console.log(socket.id + " connected to " + room);
        } else {
            socket.disconnect();
        }
    });

    socket.on('disconnect', () => {
        socket.joinedRooms.forEach((room) => {
            const userIndex = roomUserList[room].indexOf(socket.id);
            if (userIndex !== -1) {
                roomUserList[room].splice(userIndex, 1);
            }

            if (roomLeader[room] === socket.id) {
                if (roomUserList[room].length > 0) {
                    roomLeader[room] = roomUserList[room][0];
                } else {
                    delete roomLeader[room];
                }
            }

            const moderatorIndex = roomModerators[room].indexOf(socket.id);
            if (moderatorIndex !== -1) {
                roomModerators[room].splice(moderatorIndex, 1);
                if (roomModerators[room].length === 0) {
                    delete roomModerators[room];
                }
            }
            console.log(socket.id + " disconnected from " + room);
        });
    });

    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data;
        if (validRooms.has(room)) {
            io.to(room).emit('videoUrl', videoUrl);
        }
    });

    socket.on('pauseVideo', (data) => {
        const { room } = data;
        if (validRooms.has(room)) {
            io.to(room).emit('pauseVideo');
        }
    });

    socket.on('playVideo', (data) => {
        const { room } = data;
        if (validRooms.has(room)) {
            io.to(room).emit('playVideo');
        }
    });

    socket.on('seekTo', (data) => {
        const { room, time } = data;
        if (validRooms.has(room)) {
            io.to(room).emit('seekTo', time);
        }
    });

    socket.on('getRoomLeader', (room) => {
        if (validRooms.has(room)) {
            const leader = roomLeader[room];
            socket.emit('roomLeader', leader);
        }
    });

    socket.on('getModerators', (room) => {
        if (validRooms.has(room)) {
            const mods = roomModerators[room] || [];
            socket.emit('getModerators', mods);
        }
    });

    socket.on('setModerator', (room) => {
        if (validRooms.has(room)) {
            if (!roomModerators[room]) {
                roomModerators[room] = [];
            }
            roomModerators[room].push(socket.id);
            socket.emit('setModerator', socket.id);
        }
    });
});