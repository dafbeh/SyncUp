const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const io = require('socket.io')(server)
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const PORT = process.env.PORT || 3000

// Store the information about the rooms
const validRooms = new Set()
const roomLeader = {}
const roomUserList = {}
const roomStates = {}
const banList = {}

app.use(express.static('public'))

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log('Server is running on port ' + PORT)
})

async function getRoomWords() {
    const url = "https://random-word-api.herokuapp.com/word?number=2&length=3";
    try {
        let roomId;
        let unique = false;

        while (!unique) {
            const response = await fetch(url);

            if (!response.ok) {
                console.log("ERROR WITH RANDOM WORD GENERATOR, FALLBACK");
                return uuidv4();
            }

            const json = await response.json();
            roomId = json[0] + "-" + json[1];

            if (!validRooms.has(roomId)) {
                unique = true;
            }
        }
        return roomId;
    } catch (error) {
        console.error("Error in API:", error.message);
        return uuidv4();
    }
}

// Routes
app.get('/new-room', async (req, res) => {
    try {
        const roomId = await getRoomWords();
        validRooms.add(roomId);
        roomUserList[roomId] = [];
        banList[roomId] = [];
        roomStates[roomId] = {
            isPlaying: true,
            videoTime: 0,
            lastEvent: Date.now(),
            currentVideo: '',
            roomQueue: [],
            uniqueId: 0,
            isLocked: false,
        };
        res.redirect(`/${roomId}`);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: 'Failed to create a new room.' });
    }
});


app.get('/:room', (req, res) => {
    const roomId = req.params.room

    if (validRooms.has(roomId)) {
        res.sendFile(path.join(__dirname, 'public', 'room.html'))
    } else {
        res.redirect(`/`);
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
                io.to(socket.id).emit('newLeader', socket.id);
            }

            roomUserList[room].push({id: socket.id, name: socket.id})
            console.log(socket.id + ' connected to ' + room)
        } else {
            socket.emit('Room not found')
            socket.disconnect()
        }
    })

    socket.on('cookie', (data) => {
        const { roomId, identifier } = data

        if(validRooms.has(roomId)) {
            const user = roomUserList[roomId].find(user => user.id === socket.id);

            if(user) {
                user.cookie = identifier;

                if(banList[roomId].find(user => user.cookie === identifier)) {
                    socket.emit('banned', "You've been banned from this room.")
                    console.log(banList[roomId])
                    socket.disconnect()
                }
            }
        }
    })

    socket.on('disconnect', () => {
        socket.joinedRooms.forEach((room) => {
            
            if(validRooms.has(room)) {
                const name = roomUserList[room].find(user => user.id === socket.id)?.name;
                const count = roomUserList[room].length - 1;
                io.to(room).emit('whoLeft', name, count)
            }

            const userIndex = roomUserList[room].findIndex(user => user.id === socket.id)
            if (userIndex !== -1) {
                roomUserList[room].splice(userIndex, 1)
            }

            if (roomLeader[room] === socket.id) {
                if (roomUserList[room].length > 0) {
                    const id = roomUserList[room][0].id
                    roomLeader[room] = id
                    io.to(id).emit('newLeader', id);
                }
            }

            if (roomUserList[room].length === 0) {
                validRooms.delete(room)
                delete roomLeader[room]
                delete roomUserList[room]
                delete banList[room]
                delete roomStates[room]
                console.log(`Room ${room} has been removed`)
            }

            console.log(socket.id + ' disconnected from ' + room)
        })
    })

    // Send video URL to everyone in the room
    socket.on('videoUrl', (data) => {
        const { room, videoUrl } = data

        if(roomStates[room].isLocked && roomLeader[room] !== socket.id) {
            return;
        }

        if (validRooms.has(room)) {
            io.to(room).emit('videoUrl', videoUrl)
            roomStates[room].currentVideo = videoUrl
            roomStates[room].lastEvent = Date.now()
        }
    })

    socket.on('videoAction', (data) => {
        const { room, action, time } = data
        const state = roomStates[room]

        if(roomStates[room].isLocked && roomLeader[room] !== socket.id) {
            return;
        }

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
                    console.log("seeked too: " + time)
                    state.lastEvent = Date.now()
                    break
            }
            io.to(room).emit('videoAction', { action, time })
        }
    })

    function getSyncInfo(roomId) {
        const room = roomStates[roomId]
        let timePassed = (Date.now() - room.lastEvent) / 1000;

        if(!roomStates[roomId].isPlaying) {
            timePassed = 0
        }

        console.log("current video time: " + (room.videoTime + timePassed))

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

        if(roomStates[room].isLocked && roomLeader[room] !== socket.id) {
            return;
        }

        if (validRooms.has(room)) {
            console.log("video added to queue: " + roomStates[room].roomQueue)
            const newPush = {id: roomStates[room].uniqueId++, url: videoUrl}

            roomStates[room].roomQueue.push(newPush)
            io.to(room).emit('roomQueue', roomStates[room].roomQueue)
        }
    })

    socket.on('removeFromQueue', (room, uniqueId) => {

        if(roomStates[room].isLocked && roomLeader[room] !== socket.id) {
            return;
        }

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

    // Chat Settings
    socket.on('joinMessage', (room) => {
        const name = roomUserList[room].find(user => user.id === socket.id)?.name;
        if (validRooms.has(room)) {
            const count = roomUserList[room].length
            io.to(room).emit('whoJoined', name, count)
        }
    });

    socket.on('newName', (data) => {
        const { roomId, oldName, newName, isNew } = data;
        const layout = /[^A-Za-z0-9\s_-]/;
        const user = roomUserList[roomId].find(user => user.id === socket.id);
    
        if (layout.test(newName) && !(roomLeader[roomId] === socket.id)) {
            return;
        }
    
        let int = 0;
        let displayName = newName.trim();

        function recursiveNewName() {
            if (roomUserList[roomId].some(user => user.name.toLowerCase() === displayName.toLowerCase())) {
                int++;
                displayName = newName + int;
                return recursiveNewName();
            } else {
                return displayName;
            }
        }
    
        if (roomUserList[roomId].some(user => user.name.toLowerCase() === newName.toLowerCase())) {
            recursiveNewName();
        }
    
        if (validRooms.has(roomId)) {
            if (roomUserList[roomId].find(user => user.id === socket.id)) {
                user.name = displayName;
                socket.emit('changedName', { newName: displayName, isNew });
            
                if (!isNew) {
                    io.to(roomId).emit('newNameMessage', { oldName, newName: displayName, isNew });
                }
            }
        }
    });
    

    socket.on('message', (data) => {
        const { roomId, message } = data
        const name = roomUserList[roomId].find(user => user.id === socket.id)?.name;

        if(message.length < 1 || message.length > 200) {
            return;
        }

        if (validRooms.has(roomId)) {
            if(roomUserList[roomId].some(user => user.id === socket.id)) {
                if(roomLeader[roomId] !== socket.id) {
                    io.to(roomId).emit('newMessage', { name, message })
                } else {

                    if(message.includes("/ban")) {
                        const banName = message.replace("/ban ", '').trim();
                        banUser(roomId, banName, socket.id);
                        return;
                    } else if(message.includes("/unban")) {
                        const unBanName = message.replace("/unban ", '').trim();
                        const unban = banList[roomId].findIndex(user => user.name === unBanName);
                        if(unban > -1) {
                            banList[roomId].splice(unban,1);
                        }
                        return;
                    }

                    const displayName = "👑 " + name
                    io.to(roomId).emit('newMessage', { name:displayName, message })
                }
            }
        }
    });

    socket.on('lockRoom', (room, isLocked) => {
        if(validRooms.has(room)) {
            if(roomLeader[room] === socket.id) {
                roomStates[room].isLocked = isLocked
                io.to(room).emit('isLocked', isLocked)
            }
        }
    });

    socket.on('ban', (data) => {
        const { room, name } = data;

        banUser(room, name, socket.id)
    });
})

function banUser(room, name, sender) {
    const user = roomUserList[room].find(user => user.name === name);

    if(!user) {
        return;
    }

    const bannedUser = io.sockets.sockets.get(user.id);
    const cookie = user.cookie

    if (validRooms.has(room)) {
        if (roomLeader[room] === sender) {
            banList[room].push( { cookie, name } );
            bannedUser.emit('banned', "You've been banned from this room.");
            bannedUser.disconnect();

        }
    }
}