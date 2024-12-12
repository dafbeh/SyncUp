let socket = null;
let roomId = null;
let player;
let videoLoaded = false;
let loadedVideoUrl = null;
let thumbnailCounter = 0;
let canBuffer = false;

// On page load
document.addEventListener('DOMContentLoaded', () => {
    roomId = window.location.pathname.split('/')[1];
    const newRoom = document.querySelector('#newRoom');

    if (roomId) {
        connectToRoom(roomId);
        newRoom.style.display = 'none';
    } else {
        initializeSearch();
        newRoom.style.display = 'inline-block';
    }
});

// Connect to the WebSocket server
function connectToRoom(room) {
    if(socket) {
        return;
    }

    socket = io();
    socket.on('connect', () => {
        console.log("Connected to WebSocket server for room: " + room);
        socket.emit('joinRoom', room);

        setTimeout(() => {
            canBuffer = true;
        }, 2000);

        getVideoState(roomId, (state) => {
            const isPlaying = state.isPlaying;
            const currentVideo = state.currentVideo;
            const serverTime = state.serverTime;
            const elapsedPlayTime = state.elapsedPlayTime;

            if (currentVideo) {
                embedYoutube(currentVideo);
                setTimeout(() => {
                    const currentTime = Date.now();
                    const timeDifference = currentTime - serverTime;
                    const seekTime = timeDifference + elapsedPlayTime;
        
                    console.log("time difference: " + timeDifference);
        
                    console.log("Seeking to time:", seekTime / 1000);
                    
                    player.seekTo(seekTime / 1000, true);

                    if (isPlaying) {
                        player.playVideo();
                    } else {
                        player.pauseVideo();
                    }
                }, 1500);
            }
        });
    });

    // Send the URL to the server
    socket.on('videoUrl', (textboxValue) => {
        if (textboxValue === loadedVideoUrl) {
            console.log("The video is already loaded, not re-embedding.");
            return;
        }

        loadedVideoUrl = textboxValue;
        embedYoutube(textboxValue);
        
    });

    // When a video action event is received
    socket.on('videoAction', ({ action, time, elapsedPlayTime }) => {
        switch(action) {
            case 'play':
                if (player && player.playVideo) {
                    player.playVideo();
                }
                break;

            case 'pause':
                if (player && player.pauseVideo) {
                    player.pauseVideo();
                }
                break;

            case 'seek':
                if (player) {
                    player.seekTo(time, true);
                }
                break;
        }

        // Display or update the elapsed play time in the UI
        console.log(`Elapsed play time: ${elapsedPlayTime / 1000} seconds`);
    });

    socket.on('videoState', (state) => {
        console.log("Received video state from server:", state);
    });

    socket.on('addToQueue', (videoId) => {
            console.log("Creating thumbnail for: ", videoId);
            createThumbnail(videoId);
    });

    socket.on('queueData', (queue) => {
        console.log('Queue updated:', queue);
    });

    socket.on(`removeFromQueue`, (queue) => {
        console.log('Removed from queue:', queue);
    });

    socket.on('roomLeader', (leader) => {
            console.log(leader);
    });

    initializeSearch();
}

// Listeners
// Event listener for the YouTube player state change
function onPlayerStateChange(event) {

    // Global Media keys
    if(event.data == YT.PlayerState.PLAYING) {
        document.querySelector('#playSvg').setAttribute("d", "M5.163 3.819C5 4.139 5 4.559 5 5.4v13.2c0 .84 0 1.26.163 1.581a1.5 1.5 0 0 0 .656.655c.32.164.74.164 1.581.164h.2c.84 0 1.26 0 1.581-.163a1.5 1.5 0 0 0 .656-.656c.163-.32.163-.74.163-1.581V5.4c0-.84 0-1.26-.163-1.581a1.5 1.5 0 0 0-.656-.656C8.861 3 8.441 3 7.6 3h-.2c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.656.656zm9 0C14 4.139 14 4.559 14 5.4v13.2c0 .84 0 1.26.164 1.581a1.5 1.5 0 0 0 .655.655c.32.164.74.164 1.581.164h.2c.84 0 1.26 0 1.581-.163a1.5 1.5 0 0 0 .655-.656c.164-.32.164-.74.164-1.581V5.4c0-.84 0-1.26-.163-1.581a1.5 1.5 0 0 0-.656-.656C17.861 3 17.441 3 16.6 3h-.2c-.84 0-1.26 0-1.581.163a1.5 1.5 0 0 0-.655.656z");
        updateVolume();
        updateSeek();    
    } else if(event.data == YT.PlayerState.PAUSED) {
        document.querySelector('#playSvg').setAttribute("d", "M8.286 3.407A1.5 1.5 0 0 0 6 4.684v14.632a1.5 1.5 0 0 0 2.286 1.277l11.888-7.316a1.5 1.5 0 0 0 0-2.555L8.286 3.407z");
    }

    if(roomId) {
        const currentTime = player.getCurrentTime();

        if (event.data == YT.PlayerState.ENDED) {
            console.log("Video ended, playing next video in queue");
            getQueue(roomId, (queue) => {
                if (queue.length === 0) {
                    videoLoaded = false;
                } else {
                    console.log("Playing next video in queue " + queue[0]);
                    embedYoutube(queue[0]);
                }
            });
 
        } else if (event.data == YT.PlayerState.PAUSED) {
            console.log("Video paused, emitting pause event");
            socket.emit('videoAction', { room: roomId, action: 'pause', time: currentTime, clientTime: Date.now() });

        } else if (event.data == YT.PlayerState.PLAYING) {
            console.log("Video playing, emitting play event");

            socket.emit('videoAction', { room: roomId, action: 'play', time: currentTime, clientTime: Date.now() }); 
            const currentVideoUrl = player.getVideoUrl();
            const currentThumbnail = document.querySelector(`#thumbnail[data-url="${currentVideoUrl}"]`);
            if (currentThumbnail) {
                closeThumbnail(currentThumbnail.dataset.id, currentVideoUrl);
            }

        } else if (event.data == YT.PlayerState.BUFFERING) {
            if (canBuffer) {
                console.log("Video buffering at time: " + currentTime + ", emitting seek event");
                socket.emit('videoAction', { room: roomId, action: 'seek', time: currentTime, clientTime: Date.now() });
            }
        }
    }
}

// Get URL from the search bar and create an iframe
function initializeSearch() {
    const searchForm = document.querySelector('#searchForm');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleQueue(searchForm.querySelector('#searchBar').value);
    });

    const searchIcon = document.querySelector('#searchIcon');

    searchIcon.addEventListener('click', () => {
        if (searchForm.querySelector('#searchBar').value != "") {
            handleQueue(searchForm.querySelector('#searchBar').value);
        }
    });
}

function handleQueue(value) {
    if(value == "") {
        return;
    }

    if(!socket) {
        embedYoutube(value);
        return;
    }

    if(!videoLoaded && isYTLink(value)) {
        embedYoutube(value);
    } else if(videoLoaded && isYTLink(value)) {
        addToQueue(roomId, value);
    }
}

// Embed the YouTube video in the iframe
function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('#iframe iframe');
    const videoTitle = document.querySelector('#videoTitleText');

    if (existingIframe) {
        existingIframe.remove();
    }

    if (socket && textboxValue !== loadedVideoUrl) {
        socket.emit('videoUrl', { room: roomId, videoUrl: textboxValue });
    }

    if(socket) {
        socket.emit('videoUrl', { room: roomId, videoUrl: textboxValue });
    }

    if (!textboxValue.includes("youtube.com") && !textboxValue.includes("youtu.be")) {
        console.log("Invalid YouTube URL");
        const waitingElement = document.querySelector('#waiting');
        waitingElement.textContent = "Invalid URL";
        waitingElement.style.color = "red";
        videoTitle.textContent = "";

        setTimeout(() => {
            waitingElement.textContent = "...";
            waitingElement.style.color = "white";
        }, 3000);
        return;
    }

    document.getElementById('waiting').innerText = ""
    const iframe = document.createElement('iframe');
    const getID = convertUrl(textboxValue);
    const convertedUrl = "https://www.youtube.com/embed/" + getID + "?enablejsapi=1&autoplay=1&controls=0";
    console.log("Embedding YouTube video with URL:", convertedUrl);
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = convertedUrl;
    iframe.frameBorder = 0;
    iframe.allowFullscreen = true;
    document.querySelector('#iframe').appendChild(iframe);

    // Initialize the YouTube Player
    player = new YT.Player(iframe, {
        events: {
            'onReady': function(event) {
                const title = event.target.getVideoData().title;
                videoTitle.textContent = title;
                player.mute();
                resetMediaButtons();
                const duration = player.getDuration();
                document.querySelector('#seekBar').max = duration;
            },
            'onStateChange': onPlayerStateChange
        }
    });
    videoLoaded = true;
    loadedVideoUrl = textboxValue;
}

function isYTLink(url) {
    const regexPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})/;
    return regexPattern.test(url);
}

// Convert the YouTube URL to an ID
function convertUrl(oldUrl) {
    const regex = /(?:https?:\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|\S+\/v\/|\S*?[?&]v=)|youtu\.be\/))([a-zA-Z0-9_-]{11})(?:[^\w\d\s-]|$)/;
    const match = oldUrl.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}
