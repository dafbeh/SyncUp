let socket = null
let roomId = null
let player
let isLeader = false
let videoLoaded = false
let justJoined = true
let canSeek = false
let isSeeking = false
let localState = []
let queue = []
let autoPlayBlocked = false

// On page load
document.addEventListener('DOMContentLoaded', () => {
    roomId = window.location.pathname.split('/')[1]

    if (roomId) {
        connectToRoom(roomId)
    } else {
        initializeSearch()
    }
})

window.addEventListener('beforeunload', () => {
    socket.emit('leaveMessage', roomId, userName);
    socket.disconnect();
})

// Connect to the WebSocket server
function connectToRoom(room) {
    if (socket) {
        return
    }

    socket = io()
    socket.on('connect', () => {
        console.log('Connected to WebSocket server for room: ' + room)
        socket.emit('joinRoom', room)
        userName = socket.id
        updateTimer()
        syncing();

        if(document.cookie) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; username=`);
            if (parts.length === 2) {
                userName = parts.pop().split(';').shift();
                document.querySelector('#usernameInput').value = userName
                socket.emit('joinMessage', room, userName)
            }
        } else {
            socket.emit('joinMessage', room, socket.id)
        }

        socket.on('newLeader', (id) => {
            if(socket.id === id) {
                isLeader = true;
                document.getElementById('lockRoom').classList.remove("hidden");
                callAlert("You are the room leader!")
            }
        })

        socket.on('isLocked', locked => {
            const messageBox = document.getElementById('messages');
            readMessage(false)

            function sendMessage(value) {
                messageBox
                    .innerHTML +=
                    `<div class="flex justify-center items-center mb-1.5"> 
                        <span class="text-sm font-bold font-medium text-white dark:text-gray-800 mt-0 leading-tight text-center"> 
                        Room is ` + value + `!</span> 
                    </div>`;
            }

            if(!isLeader) {
                disableButtons(locked)
            }

            if(locked) {
                sendMessage("locked");
                closeAlert()
                callAlert("Room has been locked!")
            } else {
                sendMessage("unlocked");
                closeAlert()
                callAlert("Room has been unlocked!")
            }

        })

        getRoomState(roomId, (state) => {
            localState[roomId] = state
            const currentVideo = state.currentVideo
            queue = state.roomQueue
            roomLocked = state.isLocked

            if(roomLocked) {
                disableButtons(true)
            }

            if (currentVideo) {
                embedYoutube(currentVideo)
                console.log("embedding: " + currentVideo)
            }

            if (queue.length > 0) {
                renderQueue(queue)
            }
        })
    })

    // Catch URL from server
    socket.on('videoUrl', (url) => {
        canSeek = false
        loadedVideoUrl = url
        embedYoutube(url)
    })

    // When a video action event is received
    socket.on('videoAction', ({ action, time }) => {
        switch (action) {
            case 'play':
                if (player && player.playVideo) {
                    player.playVideo()
                }
                break

            case 'pause':
                if (player && player.pauseVideo) {
                    player.pauseVideo()

                    getSyncInfo(roomId, (state) => {
                        player.seekTo(state.videoTime, true)
                    });
                }
                break

            case 'seek':
                if (player) {
                    player.seekTo(time, true)
                }
                break
        }
    })

    socket.on('roomState', (state) => {
        console.log('Received video state from server:', state)
    })

    socket.on('removeEmbed', () => {
        videoLoaded = false
        const existingIframe = document.querySelector('#iframe iframe')

        console.log("queue ended removing embed")

        if (existingIframe) {
            existingIframe.remove()
            resetControls()
        }
    })

    socket.on('roomQueue', (roomQueue) => {
        queue = roomQueue
        renderQueue(queue)
    })

    socket.on('queueRemoved', (roomQueue) => {
        document.querySelector('#time').innerHTML = "00:00";
        queue = roomQueue
        renderQueue(queue)
    })

    socket.on('whoJoined', (name) => {
        const messageBox = document.getElementById('messages');
        readMessage(false)

        messageBox
            .innerHTML +=
            `<div class="flex justify-center items-center mb-1.5"> 
                <span class="text-sm font-bold font-medium text-white dark:text-gray-800 mt-0 leading-tight text-center"> 
                ` + name + ` just joined!</span> 
            </div>`;
    })

    socket.on('changedName', (data) => {
        const { oldName, newName } = data;
        const messageBox = document.getElementById('messages');
        readMessage(false)

        messageBox
        .innerHTML +=
        `<div class="flex justify-center items-center mb-1.5"> 
            <span class="text-sm font-bold font-medium text-white dark:text-gray-500 mt-0 leading-tight text-center"> 
                ` + oldName + ` changed to : ` + newName + `</span> 
        </div>`;
    })

    socket.on('newMessage', (data) => {
        const { name, message } = data;
        const messageBox = document.getElementById('messages');
        messagesRead = false;
        readMessage(false)

        messageBox.innerHTML += `
        <div class="">
            <span class="text-sm font-medium text-white dark:text-gray-900">` + name + `</span>
            <p class="text-md mt-0 leading-tight text-white dark:text-gray-900 mb-1.5 break-words">
                ` + message + `
            </p>
        </div>`;
        messageBox.scrollTop = messageBox.scrollHeight; // Set box to bottom
    })

    socket.on('whoLeft', (name) => {
        const messageBox = document.getElementById('messages');
        readMessage(false)

        messageBox
            .innerHTML +=
            `<div class="flex justify-center items-center mb-1.5"> 
                <span class="text-sm font-bold font-medium text-white dark:text-gray-800 mt-0 leading-tight text-center"> 
                ` + name + ` has left</span> 
            </div>`;
    })

    initializeSearch()
}

// Get URL from the search bar and create an iframe
function initializeSearch() {
    const searchForm = document.querySelector('#searchForm')

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault()
        handleQueue(searchForm.querySelector('#searchBar').value)
    })

    const searchIcon = document.querySelector('#searchIcon')

    searchIcon.addEventListener('click', () => {
        if (searchForm.querySelector('#searchBar').value != '') {
            handleQueue(searchForm.querySelector('#searchBar').value)
        }
    })
}

function handleQueue(url) {
    if (url == '') {
        return
    }

    if(url === "beatle") {
        loadBeatles();
        return;
    }

    if (!videoLoaded && queue.length === 0 && isYTLink(url)) {
        socket.emit('videoUrl', { room: roomId, videoUrl: url })
    } else if (videoLoaded && isYTLink(url)) {
        socket.emit('addToQueue', roomId, url)
        console.log("added to queue: " + roomId + url)
    } else {
        callAlert("Invalid YouTube URL, please try again")
    }
}

// Embed the YouTube video in the iframe
function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('#iframe iframe')
    const videoTitle = document.querySelector('#videoTitleText')
    videoLoaded = true;

    if (existingIframe) {
        existingIframe.remove()
    }

    document.getElementById('waiting').innerText = ''
    const iframe = document.createElement('iframe')
    const getID = convertUrl(textboxValue)
    const convertedUrl =
        'https://www.youtube.com/embed/' +
        getID +
        '?&enablejsapi=1&autoplay=1&controls=0&playinfo=0&disablekb=1&rel=0'
    console.log('Embedding YouTube video with URL:', convertedUrl)
    iframe.width = '100%'
    iframe.height = '100%'
    iframe.src = convertedUrl
    iframe.allowFullscreen = true
    iframe.style.pointerEvents = 'none'
    document.querySelector('#iframe').appendChild(iframe)

    // Initialize the YouTube Player
    player = new YT.Player(iframe, {
        events: {
            onReady: function (event) {
                player.mute()
                const title = event.target.getVideoData().title
                videoTitle.textContent = title
                const duration = player.getDuration()
                document.querySelector('#seekBar').max = duration

                player.setVolume( document.querySelector('#volumeR').value);

                // Set video to play / pause
                if(roomId) {
                    if(localState[roomId].isPlaying) {
                        player.playVideo()
                    } else {
                        player.pauseVideo()
                    }

                    // If its first time joining then mute (avoid autopause)
                    if(justJoined) {
                        // Seek to video play time
                        getSyncInfo(roomId, (state) => {
                            const seekTime = state.videoTime
                            console.log("justJoined, seeking to: " + seekTime)
                            console.log("video length: " + player.getDuration() + " supposed time: " + seekTime)

                            player.mute()

                            if(player.getDuration() >= seekTime) {
                                player.seekTo(seekTime, true)
                            } else {
                                console.log("Seek time is greater than video length, likely error!")
                            }
                        })
                        justJoined = false
                    }
                }
            },
            onStateChange: onPlayerStateChange,
            'onAutoplayBlocked': onAutoplayBlocked
        },
    })
}

// YouTube player state change
function onPlayerStateChange(event) {
    // Global Media keys
    if (event.data == YT.PlayerState.PLAYING) {
        document
            .querySelector('#playSvg')
            .setAttribute(
                'd',
                'M5.163 3.819C5 4.139 5 4.559 5 5.4v13.2c0 .84 0 1.26.163 1.581a1.5 1.5 0 0 0 .656.655c.32.164.74.164 1.581.164h.2c.84 0 1.26 0 1.581-.163a1.5 1.5 0 0 0 .656-.656c.163-.32.163-.74.163-1.581V5.4c0-.84 0-1.26-.163-1.581a1.5 1.5 0 0 0-.656-.656C8.861 3 8.441 3 7.6 3h-.2c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.656.656zm9 0C14 4.139 14 4.559 14 5.4v13.2c0 .84 0 1.26.164 1.581a1.5 1.5 0 0 0 .655.655c.32.164.74.164 1.581.164h.2c.84 0 1.26 0 1.581-.163a1.5 1.5 0 0 0 .655-.656c.164-.32.164-.74.164-1.581V5.4c0-.84 0-1.26-.163-1.581a1.5 1.5 0 0 0-.656-.656C17.861 3 17.441 3 16.6 3h-.2c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.655.656z'
            )
            
            canSeek = true
            document.querySelector('#iframe iframe').style.pointerEvents = 'none'

            if(autoPlayBlocked === true) {
                closeAlert()
                getSyncInfo(roomId, (state) => {
                    if(state.videoTime <= player.getDuration()) {
                        console.log("auto play seek to: " + state.videoTime)
                        player.seekTo(state.videoTime, true)
                    }
                })
                autoPlayBlocked = false
            }

    } else if (event.data == YT.PlayerState.PAUSED) {
        document
            .querySelector('#playSvg')
            .setAttribute(
                'd',
                'M8.286 3.407A1.5 1.5 0 0 0 6 4.684v14.632a1.5 1.5 0 0 0 2.286 1.277l11.888-7.316a1.5 1.5 0 0 0 0-2.555L8.286 3.407z'
        )

        getRoomState(roomId, (state) => {
            const isPlaying = state.isPlaying
            
            if(isPlaying) {
                canSeek = false;
                autoPlayBlocked = true
                document.querySelector('#iframe iframe').style.pointerEvents = 'auto'
                setTimeout(() => {
                    if(isPlaying && !document.hidden) {
                        callAlert("Your browser has blocked autoplay! Click the video to continue")
                    }
                }, 500)
            }
        })
    }

    if (event.data == YT.PlayerState.ENDED) {
        if(canSeek) {
            if(isLeader) {
                const url = player.getVideoUrl();
                const room = roomId;
                socket.emit('videoEnded', { room, url });
            }
        }
    } 
}

function onAutoplayBlocked(event) {
    autoPlayBlocked = true
    console.log("Autoplay was blocked:", event);
    document.querySelector('#iframe iframe').style.pointerEvents = 'auto'
}

function isYTLink(url) {
    const regexPattern =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})/
    return regexPattern.test(url)
}

// Convert the YouTube URL to an ID
function convertUrl(oldUrl) {
    const regex =
        /(?:https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|\S+\/v\/|\S*?[?&]v=)|youtu\.be\/))([a-zA-Z0-9_-]{11})(?:[^\w\d\s-]|$)/
    const match = oldUrl.match(regex)
    if (match && match[1]) {
        return match[1]
    }
    return null
}

// Add thumbnail
function createThumbnail(data) {
    const id = data.id
    const url = data.url

    const videoId = convertUrl(url);
    const thumbnailUrl = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

    const createThumbnailElement = (container) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = url + ' w-full border mx-auto aspect-video rounded-lg relative mb-2 cursor-pointer';
        thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';

        const thumbnailSettings = document.createElement('div');
        thumbnailSettings.dataset.id = 'thumbnailSettings';
        thumbnailSettings.className = 'absolute top-1 left-1 flex items-center justify-center bg-black/50 hover:bg-white/50 rounded-lg p-px';

        const exitThumbnail = document.createElement('img');
        exitThumbnail.id = 'exitThumbnail';
        exitThumbnail.className = 'w-8 h-8 p-2 cursor-pointer';
        exitThumbnail.src = 'images/exit.png';
        exitThumbnail.alt = 'Close';
        exitThumbnail.draggable = false;

        exitThumbnail.addEventListener('click', () => {
            socket.emit('removeFromQueue', roomId, id);
            console.log("removing " + id)
        });

        thumbnailSettings.appendChild(exitThumbnail);
        thumbnail.appendChild(thumbnailSettings);
        container.appendChild(thumbnail);
    };

    // Create and append thumbnails for both containers
    const queueContainer = document.querySelector('#queuePc');
    const mQueueContainer = document.querySelector('#queueM');
    createThumbnailElement(queueContainer);
    createThumbnailElement(mQueueContainer);
}

function renderQueue(queue) {
    const queuePc = document.querySelector('#queuePc');
    const queueM = document.querySelector('#queueM');
    queuePc.innerHTML = '';
    queueM.innerHTML = '';

    if (queue.length > 0) {
        for(let i in queue) {
            createThumbnail(queue[i]);
        }
    }
}

/* Getters and Setters */
function getRoomState(roomId, callback) {
    socket.emit('getRoomState', roomId);

    socket.once('roomState', (state) => {
        callback(state);
    });
}

function getSyncInfo(roomId, callback) {
    socket.emit('getSyncInfo', roomId);

    socket.once('syncInfo', (state) => {
            callback(state);
    });
}

function getQueue(room, callback) {
    socket.emit('getRoomQueue', room);

    socket.once('roomQueue', (state) => {
        callback(state);
    })
}