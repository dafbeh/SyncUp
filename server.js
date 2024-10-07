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
    roomStates[roomId] = {};
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
        if(validRooms.has(room)) {
            socket.join(room);
            socket.joinedRooms.push(room);
            socket.emit('currentVideoState', roomStates[room]);

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

    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data;
        if (validRooms.has(room)) {
            roomStates[room] = {
                ...roomStates[room],
                videoUrl: videoUrl,
                currentTime: 0,
                isPlaying: false,
            };
            io.to(room).emit('videoUrl', videoUrl);
        }
    });

    socket.on('videoAction', (data) => {
        const { room, action, time } = data;
        if (validRooms.has(room)) {
            switch(action) {
                case 'play':
                    roomStates[room].isPlaying = true;
                    io.to(room).emit('videoAction', { action: 'play', time, serverTime: Date.now() });
                    break;
                case 'pause':
                    roomStates[room].isPlaying = false;
                    roomStates[room].currentTime = time;
                    io.to(room).emit('videoAction', { action: 'pause', time, serverTime: Date.now() });
                    break;
                case 'seek':
                    roomStates[room].currentTime = time;
                    io.to(room).emit('videoAction', { action: 'seek', time, serverTime: Date.now() });
                    break;
            }
        }
    });

    /* Getters and Setters */
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