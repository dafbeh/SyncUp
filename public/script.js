let socket = null;
let roomId = null;
let player;
let videoLoaded = false;
let loadedVideoUrl = null;
let thumbnailCounter = 0;

// On page load
document.addEventListener('DOMContentLoaded', () => {
    roomId = window.location.pathname.split('/')[1];
    const newRoom = document.querySelector('.newRoom');

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

    socket.on('addToQueue', (queue) => {
            console.log("Added to queue: ", queue);
    });

    socket.on('queueData', (queue) => {
        console.log('Queue updated:', queue);
    });

    socket.on(`removeFromQueue`, (queue) => {
        console.log('Removed from queue:', queue);
    });

    // Actions / Events to be emitted to the server
    socket.on('pauseVideo', () => {
        if (player && player.pauseVideo) {
            player.pauseVideo();
        }
    });

    socket.on('playVideo', () => {
        if (player && player.playVideo) {
            player.playVideo();
        }
    });

    socket.on('seekTo', (time) => {
        if (player) {
            player.seekTo(time, true);
        }
    });

    socket.on('roomLeader', (leader) => {
            console.log(leader);
    });

    socket.on('getModerators', (mods) => {
        console.log(mods);
    });

    socket.on('setModerator', (mod) => {
        console.log(mod);
    });

    initializeSearch()
}

// Listeners
// Event listener for the YouTube player state change
function onPlayerStateChange(event) {
    if(roomId) {
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
            socket.emit('pauseVideo', { room: roomId });

        } else if (event.data == YT.PlayerState.PLAYING) {
            console.log("Video playing, emitting play event");
            socket.emit('playVideo', { room: roomId });
            const currentVideoUrl = player.getVideoUrl();
            const currentThumbnail = document.querySelector(`.thumbnail[data-url="${currentVideoUrl}"]`);
            if (currentThumbnail) {
                closeThumbnail(currentThumbnail.dataset.id, currentVideoUrl);
            }

        } else if (event.data == YT.PlayerState.BUFFERING) {
            const currentTime = player.getCurrentTime();
            console.log("Video buffering at time: " + currentTime + ", emitting seek event");
            socket.emit('seekTo', { room: roomId, time: currentTime });
        }
    }
}

// Get URL from the search bar and create an iframe
function initializeSearch() {
    const searchForm = document.querySelector('#searchForm');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleQueue(searchForm.querySelector('.searchBar').value);
    });

    const searchIcon = document.querySelector('.searchIcon');

    searchIcon.addEventListener('click', () => {
        if (searchForm.querySelector('.searchBar').value != "") {
            handleQueue(searchForm.querySelector('.searchBar').value);
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
        createThumbnail(value);
    }
}

// Embed the YouTube video in the iframe
function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('.iframe iframe');
    const videoTitle = document.querySelector('.videoTitleText');

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
        const waitingElement = document.querySelector('.waiting');
        waitingElement.textContent = "Invalid URL";
        waitingElement.style.color = "red";
        videoTitle.textContent = "";

        setTimeout(() => {
            waitingElement.textContent = "...";
            waitingElement.style.color = "white";
        }, 3000);
        return;
    }

    const iframe = document.createElement('iframe');
    const getID = convertUrl(textboxValue);
    const convertedUrl = "https://www.youtube.com/embed/" + getID + "?enablejsapi=1&autoplay=1";
    console.log("Embedding YouTube video with URL:", convertedUrl);
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = convertedUrl;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = 0;
    iframe.allowFullscreen = true;
    document.querySelector('.iframe').appendChild(iframe);

    // Initialize the YouTube Player
    player = new YT.Player(iframe, {
        events: {
            'onReady': function(event) {
                const title = event.target.getVideoData().title;
                videoTitle.textContent = title;
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
    const url = new URL(oldUrl);
    let videoID;

    if (url.hostname.includes("youtube.com") && url.searchParams.has("v")) {
        videoID = url.searchParams.get("v");
    }

    else if (url.hostname === "youtu.be") {
        videoID = url.pathname.split('/')[1];
    }

    else if (url.pathname.startsWith("/shorts/")) {
        videoID = url.pathname.split('/')[2] || url.pathname.split('/')[1];
    }

    return videoID;
}

// Add thumbnail

function createThumbnail(url) {
    const videoId = convertUrl(url);
    const thumbnailUrl = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

    const queueContainer = document.querySelector('.queueContainer');

    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.style.backgroundImage = `url(${thumbnailUrl})`;
    thumbnail.style.backgroundSize = 'cover';
    thumbnail.dataset.url = url;
    thumbnail.dataset.id = `thumbnail-` + thumbnailCounter++;

    const thumbnailSettings = document.createElement('div');
    thumbnailSettings.className = 'thumbnailSettings';

    const exitThumbnail = document.createElement('img');
    exitThumbnail.className = 'exitThumbnail';
    exitThumbnail.src = 'images/exit.png';
    exitThumbnail.alt = 'exit';
    exitThumbnail.draggable = false;

    exitThumbnail.addEventListener('click', () => { 
        closeThumbnail(thumbnail.dataset.id, url);
    });

    thumbnailSettings.appendChild(exitThumbnail);
    thumbnail.appendChild(thumbnailSettings);
    queueContainer.appendChild(thumbnail);
}

function closeThumbnail(id, url) {
    const thumbnail = document.querySelector('.thumbnail[data-id="' + id + '"]');
    if (thumbnail) {
        thumbnail.remove();
        removeFromQueue(roomId, url);
    }
}

/* Getters and Setters */
function addToQueue(room, videoId) {
    socket.emit('addToQueue', { room, videoId });
}

function removeFromQueue(room, videoId) {
    socket.emit('removeFromQueue', { room, videoId });
}

function getQueue(room, callback) {
    console.log("Requesting queue for room:", room);
    socket.emit('getQueue', room);

    socket.once('queueData', (queue) => {
        console.log("Received queue data from server:", queue);
        callback(queue);
    });
}

/* Permission Functions */
function setModerator(socketID) {
    socket.emit('setModerator', socketID);
}

function getModerators(room) {
    socket.emit('getModerators', room);
}