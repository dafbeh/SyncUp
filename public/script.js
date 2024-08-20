let socket = null;
let roomId = null;
let player;

// On page load
document.addEventListener('DOMContentLoaded', () => {
    roomId = window.location.pathname.split('/')[1];
    if (roomId) {
        connectToRoom(roomId);
    } else {
        initializeSearch();
    }
});

function connectToRoom(room) {
    socket = io();
    socket.on('connect', () => {
        console.log(`Connected to WebSocket server for room: ${room}`);
        socket.emit('joinRoom', room);
    });

    socket.on('videoUrl', (textboxValue) => {
        console.log("Received video URL from server:", textboxValue);

        const existingIframe = document.querySelector('.iframe iframe');
        if (existingIframe) {
            existingIframe.remove();
        }

        embedYoutube(textboxValue);
    });

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

    initializeSearch();
}

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

function createIFrame() {
    const textboxValue = document.querySelector('.searchBar').value;

    if (!textboxValue.includes("youtube.com")) {
        return console.log("Invalid URL");
    }

    if (socket) {
        socket.emit('videoUrl', { room: roomId, videoUrl: textboxValue });
    }

    const existingIframe = document.querySelector('.iframe iframe');
    if (existingIframe) {
        existingIframe.remove();
    }
    embedYoutube(textboxValue);
}

function embedYoutube(textboxValue) {
    const existingIframe = document.querySelector('.iframe iframe');
    if (existingIframe) {
        existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    const convertedUrl = convertUrl(textboxValue) + "?enablejsapi=1&autoplay=1";
    console.log("Embedding YouTube video with URL:", convertedUrl);

    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = convertedUrl;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = 0;
    iframe.allowFullscreen = true;

    document.querySelector('.iframe').appendChild(iframe);

    // Initialize the YouTube Player
    iframe.onload = () => {
        player = new YT.Player(iframe, {
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    };
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PAUSED) {
        console.log("Video paused, emitting pause event");
        socket.emit('pauseVideo', { room: roomId });

    } else if (event.data == YT.PlayerState.PLAYING) {
        console.log("Video playing, emitting play event");
        socket.emit('playVideo', { room: roomId });

    } else if (event.data == YT.PlayerState.BUFFERING) {
        const currentTime = player.getCurrentTime();
        console.log(`Video buffering at time: ${currentTime}, emitting seek event`);
        socket.emit('seekTo', { room: roomId, time: currentTime });
    }
}

function convertUrl(oldUrl) {
    const url = new URL(oldUrl);
    const newUrl = url.searchParams.get("v");
    return `https://www.youtube.com/embed/${newUrl}`;
}
