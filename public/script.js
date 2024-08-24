let socket = null;
let roomId = null;
let player;

// Connect to the WebSocket server
function connectToRoom(room) {
    socket = io();
    socket.on('connect', () => {
        console.log("Connected to WebSocket server for room: " + room);
        socket.emit('joinRoom', room);
    });

    // Send the URL to the server
    socket.on('videoUrl', (textboxValue) => {
        console.log("Received video URL from server: ", textboxValue);

        const existingIframe = document.querySelector('.iframe iframe');
        if (existingIframe) {
            existingIframe.remove();
        }

        embedYoutube(textboxValue);
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

    initializeSearch();
}

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


// Listeners
// Event listener for the YouTube player state change
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PAUSED) {
        console.log("Video paused, emitting pause event");
        socket.emit('pauseVideo', { room: roomId });

    } else if (event.data == YT.PlayerState.PLAYING) {
        console.log("Video playing, emitting play event");
        socket.emit('playVideo', { room: roomId });

    } else if (event.data == YT.PlayerState.BUFFERING) {
        const currentTime = player.getCurrentTime();
        console.log("Video buffering at time: " + currentTime + ", emitting seek event");
        socket.emit('seekTo', { room: roomId, time: currentTime });
    }
}

// Get URL from the search bar and create an iframe
function initializeSearch() {
    const searchForm = document.querySelector('#searchForm');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createIFrame();
    });

    const searchIcon = document.querySelector('.searchIcon');

    searchIcon.addEventListener('click', () => {
        if (searchForm.querySelector('.searchBar').value != "") {
            createIFrame();
        }
    });
}

// Create the iframe element and embed the YouTube video
function createIFrame() {
    const textboxValue = document.querySelector('.searchBar').value;

    if (socket) {
        socket.emit('videoUrl', { room: roomId, videoUrl: textboxValue });
    }

    const existingIframe = document.querySelector('.iframe iframe');
    if (existingIframe) {
        existingIframe.remove();
    }
    embedYoutube(textboxValue); 
}

// Embed the YouTube video in the iframe
function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('.iframe iframe');
    const videoTitle = document.querySelector('.videoTitleText');

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
    
    if (existingIframe) {
        existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    const convertedUrl = convertUrl(textboxValue);
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
}

// Convert the YouTube URL to an embeddable URL
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

    return "https://www.youtube.com/embed/" + videoID + "?enablejsapi=1&autoplay=1";
}

/* Permission Functions */
function setModerator(socketID) {
    socket.emit('setModerator', socketID);
}

function getModerators(room) {
    socket.emit('getModerators', room);
}