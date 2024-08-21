const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const path = require('path');

const PORT = process.env.PORT || 3000;

const validRooms = new Set();
const roomLeader = {};
const roomUserList = {};

app.use(express.static('public'));

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/new-room', (req, res) => {
    const roomId = uuidv4();
    validRooms.add(roomId);
    roomUserList[roomId] = [];
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
    console.log(`${socket.id} connected`);

    socket.joinedRooms = [];

    socket.on('joinRoom', (room) => {
        if(validRooms.has(room)) {
            socket.join(room);
            socket.joinedRooms.push(room);

            if (roomUserList[room].length === 0) {
                roomLeader[room] = socket.id;
            }

            roomUserList[room].push(socket.id);
        } else {
            socket.disconnect();
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);

        socket.joinedRooms.forEach((room) => {
            const userIndex = roomUserList[room].indexOf(socket.id);
            if (userIndex !== -1) {
                roomUserList[room].splice(userIndex, 1);
            }

            if (roomLeader[room] === socket.id) {
                roomLeader[room] = roomUserList[room][0];
            }

            if (roomLeader[room] === socket.id) {
                if (roomUserList[room].length > 0) {
                    roomLeader[room] = roomUserList[room][0];
                } else {
                    delete roomLeader[room];
                }
            }
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
});