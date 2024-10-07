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
const roomQueue = {};
const roomLeader = {};
const roomUserList = {};
const roomStates = {};

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
    roomQueue[roomId] = [];
    roomStates[roomId] = { 
        isPlaying: false, 
        startTime: 0, 
        elapsedPlayTime: 0 
    };
    res.redirect(`/${roomId}`);
});

// Route to join a room
app.get('/:room', (req, res) => {
    const roomId = req.params.room;

    if (validRooms.has(roomId)) {
        res.sendFile(path.join(__dirname, 'public', 'room.html'));
    } else {
        res.status(404).send('Room not found');
    }
});

// WebSocket server connection
io.on('connection', (socket) => {
    socket.joinedRooms = [];

    socket.on('joinRoom', (room) => {
        if (validRooms.has(room)) {
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
            console.log(socket.id + " disconnected from " + room);
        });
    });

    // Send video URL to everyone in the room
    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data;
        if (validRooms.has(room)) {
            io.to(room).emit('videoUrl', videoUrl);
        }
    });

    // Broadcast video action to the room
    socket.on('videoAction', (data) => {
        const { room, action, time } = data;
        const currentTime = Date.now();
        const state = roomStates[room];

        if (validRooms.has(room)) {
            switch(action) {
                case 'play':
                    if (!state.isPlaying) {
                        state.isPlaying = true;
                        state.startTime = currentTime;
                    }
                    break;
                case 'pause':
                    if (state.isPlaying) {
                        state.isPlaying = false;
                        state.elapsedPlayTime += currentTime - state.startTime;
                        state.startTime = 0;
                    }
                    break;
                case 'seek':
                    state.startTime = currentTime - time * 1000;
                    state.elapsedPlayTime = time * 1000;
                    break;
            }
            io.to(room).emit('videoAction', { action, time, serverTime: currentTime, elapsedPlayTime: state.elapsedPlayTime });
            console.log(`Elapsed play time: ${state.elapsedPlayTime / 1000} seconds`);
        }
    });

    /* Additional Functions and Listeners */
    socket.on('addToQueue', (data) => {
        const { room, videoId } = data;
        if (validRooms.has(room)) {
            roomQueue[room].push(videoId);
            io.to(room).emit('addToQueue', videoId);
        }
    });

    socket.on('getQueue', (room) => {
        if (validRooms.has(room)) {
            socket.emit('queueData', roomQueue[room] || []);
        }
    });

    socket.on('removeFromQueue', (data) => {
        const { room, url } = data;
        if (validRooms.has(room)) {
            const queue = roomQueue[room];
            const index = queue.findIndex(item => item.url === url);
            if (index !== -1) {
                queue.splice(index, 1);
                io.to(room).emit('removeFromQueue', queue);
            }
        }
    });

    socket.on('getRoomLeader', (room) => {
        if (validRooms.has(room)) {
            const leader = roomLeader[room];
            socket.emit('roomLeader', leader);
        }
    });
});

