import { WsClient } from "@ion/ws/client";
import { type MainWsEndpoint } from "../controllers/ws/index.js";

const ws = new WsClient<MainWsEndpoint>("/ws");

const socket = await ws.connect();

socket.on("chat.broadcastMessage", ({ username, message }) => {
	console.log(`${username}: ${message}`);
});

socket.emit("chat.message", "");