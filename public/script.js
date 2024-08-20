console.log("Client-side script loaded");

const socket = io();

socket.on('connect', () => {
    console.log("Connected to WebSocket server");
});

socket.on('videoUrl', (textboxValue) => {
    console.log("Received video URL from server:", textboxValue);
    
    const existingIframe = document.querySelector('.iframe iframe');
    if (existingIframe) {
        existingIframe.remove();
    }
    
    embedYoutube(textboxValue);
});

const searchForm = document.querySelector('#searchForm');

searchForm.addEventListener('submit', (e) => { 
    e.preventDefault();
    createIFrame();
});

const searchIcon = document.querySelector('.searchIcon');

searchIcon.addEventListener('click', () => {
    createIFrame();
});

function createIFrame() {
    const textboxValue = searchForm.querySelector('.searchBar').value;
    
    socket.emit('videoUrl', textboxValue);
    
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
