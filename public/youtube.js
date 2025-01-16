let socket = null
let roomId = null
let player
let isLeader = false
let videoLoaded = false
let justJoined = true
let canSeek = false
let isSeeking = false
let queue = []
let localState = []
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

// Connect to the WebSocket server
function connectToRoom(room) {
    if (socket) {
        return
    }

    socket = io()
    socket.on('connect', () => {
        console.log('Connected to WebSocket server for room: ' + room)
        socket.emit('joinRoom', room)

        getLeader(roomId, (state) => {
            if(socket.id === state) {
                isLeader = true;
                console.log("You are the room leader!")
            }
        })

        getRoomState(roomId, (state) => {
            localState[roomId] = state
            const currentVideo = state.currentVideo
            queue = state.roomQueue
            
            if (queue.length > 0) {
                for (let i in queue) {
                    createThumbnail(queue[i]);
                    console.log("added: " + queue[i])
                }
            }

            if (currentVideo) {
                embedYoutube(currentVideo)
                console.log("embedding: " + currentVideo)
            }
        })
    })

    // Catch URL from server
    socket.on('videoUrl', (textboxValue) => {
        loadedVideoUrl = textboxValue
        embedYoutube(textboxValue)
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

    socket.on('addToQueue', (videoId) => {
        console.log('Creating thumbnail for: ', videoId)
        createThumbnail(videoId)
    })

    socket.on('queueData', (queue) => {
        console.log('Queue updated:', queue)
    })

    socket.on(`removeFromQueue`, ({ queue, url }) => {
        const thumbnail = document.querySelector(`[data-id="${url}"]`);
        queue.pop();
    
        if (thumbnail) {
            thumbnail.remove();
        } else {
            console.log("No thumbnail found!")
        }

        socket.emit('updateQueue', { room: roomId, queue });
        console.log('Updated queue after removal:', queue);
    });

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

function handleQueue(value) {
    if (value == '') {
        return
    }

    if (!socket) {
        embedYoutube(value)
        return
    }

    if (!videoLoaded && queue.length >= 0 && isYTLink(value)) {
        socket.emit('videoUrl', { room: roomId, videoUrl: value })
    } else if (videoLoaded && isYTLink(value)) {
        addToQueue(roomId, value)
    } else {
        callAlert("Invalid YouTube URL, please try again")
    }
}

// Embed the YouTube video in the iframe
function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('#iframe iframe')
    const videoTitle = document.querySelector('#videoTitleText')

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
    videoLoaded = true
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
            updateTimer()
            canSeek = true
            document.querySelector('#iframe iframe').style.pointerEvents = 'none'

            if(autoPlayBlocked === true) {
                getSyncInfo(roomId, (state) => {
                    player.seekTo(state.videoTime, true)
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
                    if(isPlaying) {
                        callAlert("Your browser has blocked autoplay! Click the video to continue")
                    }
                }, 250)
            }
        })
    }

    if (roomId) {
        if (event.data == YT.PlayerState.ENDED) {
            console.log('Video ended, playing next video in queue')

            if(isLeader) {
                const url = player.getVideoUrl();
                const room = roomId;
                socket.emit('videoEnded', { room, url });
            }

            getQueue(roomId, (queue) => {
                if (queue.length === 0) {
                    videoLoaded = false
                    resetControls()
                    document.querySelector('#iframe iframe').remove()
                } else {
                    console.log('Playing next video in queue ' + queue[0])
                    embedYoutube(queue[0])
                    if (isLeader) {
                        removeFromQueue(roomId, queue[0])
                    }
                }
            })
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
function createThumbnail(url) {
    const videoId = convertUrl(url);
    const thumbnailUrl = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

    const queueContainer = document.querySelector('#queueContainer');

    const thumbnail = document.createElement('div');
    thumbnail.className = url + ' w-full border mx-auto aspect-video rounded-lg relative mb-2';
    thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
    thumbnail.style.backgroundSize = 'cover';
    thumbnail.style.backgroundPosition = 'center';
    thumbnail.dataset.url = url;
    thumbnail.dataset.id = url;

    const thumbnailSettings = document.createElement('div');
    thumbnailSettings.dataset.id = 'thumbnailSettings';
    thumbnailSettings.className = 'absolute top-1 left-1 flex items-center justify-center bg-black/50 hover:bg-black/75 rounded-full p-1';

    const exitThumbnail = document.createElement('img');
    exitThumbnail.id = 'exitThumbnail';
    exitThumbnail.className = 'w-6 h-6 p-2 cursor-pointer';
    exitThumbnail.src = 'images/exit.png';
    exitThumbnail.alt = 'Close';
    exitThumbnail.draggable = false;

    exitThumbnail.addEventListener('click', () => {
        removeFromQueue(roomId, thumbnail.dataset.url)
        console.log("closing: " + thumbnail.dataset.id)
    });

    thumbnailSettings.appendChild(exitThumbnail);
    thumbnail.appendChild(thumbnailSettings);
    queueContainer.appendChild(thumbnail);
}

/* Getters and Setters */
function getLeader(roomId, callback) {
    socket.emit('getRoomLeader', roomId);

    socket.once('roomLeader', (state) => {
            callback(state);
    });
}

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

function addToQueue(room, videoId) {
    socket.emit('addToQueue', { room, videoId });
}

function removeFromQueue(room, url) {
    socket.emit('removeFromQueue', { room, url });
}

function getQueue(room, callback) {
    console.log("Requesting queue for room:", room);
    socket.emit('getQueue', room);

    socket.once('queueData', (queue) => {
        console.log("Received queue data from server:", queue);
        callback(queue);
    });
}