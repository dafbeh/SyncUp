let socket = null;
let roomId = null;

// On page load
document.addEventListener('DOMContentLoaded', () => {
    roomId = window.location.pathname.split('/')[1];
    if (roomId) {
        connectToRoom(roomId);
    } else {
        initializeSearch();
    }
});

// Listeners
const homePage = document.querySelector('.logo');
homePage.addEventListener('click', () => {
    window.location.href = '/';
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
    var iframe = document.createElement('iframe');
    var convertedUrl = convertUrl(textboxValue) + "?rel=0&autoplay=1";

    console.log(convertedUrl);

    iframe.width = "100%";
    iframe.height = "100%";
    iframe.src = convertedUrl;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.frameBorder = 0;
    iframe.allowFullscreen = true;

    document.querySelector('.iframe').appendChild(iframe);
}

function convertUrl(oldUrl) {
    const url = new URL(oldUrl);
    const newUrl = url.searchParams.get("v");
    return `https://www.youtube.com/embed/${newUrl}`;
}
