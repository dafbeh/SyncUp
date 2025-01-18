const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const { v4: uuidv4 } = require('uuid')

// Configure the server
const PORT = process.env.PORT || 3000

// Store the information about the rooms
const validRooms = new Set()
const roomLeader = {}
const roomUserList = {}
const roomStates = {}

app.use(express.static('public'))

// Start the server
server.listen(PORT, () => {
    console.log('Server is running on port ' + PORT)
})

// Routes
app.get('/new-room', (req, res) => {
    const roomId = uuidv4()
    validRooms.add(roomId)
    roomUserList[roomId] = []
    roomStates[roomId] = {
        isPlaying: true,
        videoTime: 0,
        lastEvent: Date.now(),
        currentVideo: '',
        roomQueue: [],
        uniqueId: 0,
    }
    res.redirect(`/${roomId}`)
})

app.get('/:room', (req, res) => {
    const roomId = req.params.room

    if (validRooms.has(roomId)) {
        res.sendFile(path.join(__dirname, 'public', 'room.html'))
    } else {
        res.status(404).send('Room not found')
    }
})

// WebSocket server connection
io.on('connection', (socket) => {
    socket.joinedRooms = []

    socket.on('joinRoom', (room) => {
        if (validRooms.has(room)) {
            socket.join(room)
            socket.joinedRooms.push(room)

            if (roomUserList[room].length === 0) {
                roomLeader[room] = socket.id
            }

            roomUserList[room].push(socket.id)
            console.log(socket.id + ' connected to ' + room)
        } else {
            socket.emit('Room not found')
            socket.disconnect()
        }
    })

    socket.on('disconnect', () => {
        socket.joinedRooms.forEach((room) => {
            const userIndex = roomUserList[room].indexOf(socket.id)
            if (userIndex !== -1) {
                roomUserList[room].splice(userIndex, 1)
            }

            if (roomLeader[room] === socket.id) {
                if (roomUserList[room].length > 0) {
                    roomLeader[room] = roomUserList[room][0]
                } else {
                    delete roomLeader[room]
                }
            }

            if (roomUserList[room].length === 0) {
                validRooms.delete(room)
                delete roomLeader[room]
                delete roomUserList[room]
                delete roomStates[room]
                console.log(`Room ${room} has been removed`)
            }

            console.log(socket.id + ' disconnected from ' + room)
        })
    })

    // Send video URL to everyone in the room
    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data
        if (validRooms.has(room)) {
            io.to(room).emit('videoUrl', videoUrl)
            roomStates[room].currentVideo = videoUrl
            roomStates[room].lastEvent = Date.now()
        }
    })

    // Broadcast video action to the room
    socket.on('videoAction', (data) => {
        const { room, action, time } = data
        const state = roomStates[room]

        if (validRooms.has(room)) {
            switch (action) {
                case 'play':
                    if (!state.isPlaying) {
                        state.isPlaying = true
                        state.videoTime = time
                        state.lastEvent = Date.now()
                    }
                    break
                case 'pause':
                    if (state.isPlaying) {
                        state.isPlaying = false
                        state.videoTime = time
                        state.lastEvent = Date.now()
                    }
                    break
                case 'seek':
                    state.videoTime = time
                    state.lastEvent = Date.now()
                    break
            }
            io.to(room).emit('videoAction', { action, time })
        }
    })

    function getSyncInfo(roomId) {
        const room = roomStates[roomId]
        const timePassed = (Date.now() - room.lastEvent) / 1000;

        console.log("current video time: " + room.videoTime)

        if(room.isPlaying) {
            return {
                videoTime: (room.videoTime + timePassed),
                isPlaying: true
            }
        } else if(!room.isPlaying) {
            return {
                videoTime: room.videoTime,
                isPlaying: false
            }
        }
    }

    socket.on('getSyncInfo', (roomId) => {
        socket.emit('syncInfo', getSyncInfo(roomId));
    });

    socket.on('getRoomState', (room) => {
        if (validRooms.has(room)) {
            roomStates[room].serverTime = Date.now()
            const state = roomStates[room]
            socket.emit('roomState', state)
        }
    })

    /* Additional Functions and Listeners */
    socket.on('getRoomQueue', (room) => {
        if (validRooms.has(room)) {
            const roomQueue = roomStates[room].roomQueue
            socket.emit('roomQueue', roomQueue)
        }
    })

    socket.on('addToQueue', (room, videoUrl) => {
        if (validRooms.has(room)) {
            console.log("video added to queue: " + roomStates[room].roomQueue)
            const newPush = {id: roomStates[room].uniqueId++, url: videoUrl}

            roomStates[room].roomQueue.push(newPush)
            io.to(room).emit('roomQueue', roomStates[room].roomQueue)
        }
    })

    socket.on('removeFromQueue', (room, uniqueId) => {
        console.log("Attempting to remove item with id:", uniqueId);
        
        if (validRooms.has(room)) {
            const index = roomStates[room].roomQueue.findIndex(item => item.id === uniqueId);
    
            if (index !== -1) {
                roomStates[room].roomQueue.splice(index, 1);
                io.to(room).emit('queueRemoved', roomStates[room].roomQueue);
            }
        }
    });    
    

    socket.on('getRoomLeader', (room) => {
        if (validRooms.has(room)) {
            const leader = roomLeader[room]
            socket.emit('roomLeader', leader)
        }
    })

    socket.on('videoEnded', (data) => {
        const { room, url } = data;
        if (validRooms.has(room)) {
            console.log(url + " has ended...");
            if(roomStates[room].roomQueue.length === 0 && socket.id === roomLeader[room]) {
                roomStates[room].currentVideo = ''
                roomStates[room].lastEvent = 0
                roomStates[room].videoTime = 0
                console.log("current video wiped" + roomStates[room].currentVideo)
                io.to(room).emit('removeEmbed')
            }
            if (roomStates[room].roomQueue.length > 0) {
                const shifted = roomStates[room].roomQueue.shift();
                const nextVideo = shifted.url;

                console.log("queue popped, next is: " + nextVideo);
                roomStates[room].currentVideo = nextVideo;
                io.to(room).emit('videoUrl', nextVideo);
                roomStates[room].lastEvent = Date.now()
                roomStates[room].videoTime = 0
                io.to(room).emit('queueRemoved', roomStates[room].roomQueue)
            }
        }
    });
})