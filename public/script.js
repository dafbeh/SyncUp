console.log("Client-side script loaded");

const socket = io();

socket.on('connect', () => {
    console.log("Connected to WebSocket server");
});