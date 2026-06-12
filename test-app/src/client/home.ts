import { ws } from "./ws.js";

const socket = await ws.connect();

socket.on("chat.broadcastMessage", ({ username, message }) => {
	console.log(`${username}: ${message}`);
});

socket.emit("chat.message", "Hello world!");