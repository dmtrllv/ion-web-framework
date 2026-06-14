import { ws } from "./ws.js";

const socket = await ws.connect();

socket.emit("chat.connect", 0);

let roomId = 0;

const chat = document.getElementById("chat");
const input = document.getElementById("chat-input") as HTMLInputElement;

const rand = () => Math.floor((Math.random() * 255) + 1);

const userColorMap: Record<string, string> = {};

const getColor = (user: string) => {
	if (!(user in userColorMap)) {
		const r = rand();
		const g = rand();
		let b;
		if (r + g < 255) {
			b = rand() + 50;
		} else {
			b = rand();
		}
		userColorMap[user] = `rgb(${r},${g},${b})`;
	}
	return userColorMap[user]!;
};

input?.addEventListener("keydown", (e) => {
	if (e.code === "Enter") {
		socket.emit("chat.message", {
			message: input.value,
			room: roomId
		});
		input.value = "";
	}
});

socket.on("chat.broadcastMessage", ({ username, message }) => {
	if (chat) {
		const el = document.createElement("div");
		el.style.color = getColor(username);
		el.textContent = `${username}: ${message}`;
		chat.appendChild(el);
	}
});

socket.on("chat.connected", ({ username }) => {
	if (chat) {
		const el = document.createElement("div");
		el.style.fontSize = "10px";
		el.style.opacity = "0.75";
		el.style.color = getColor(username);
		el.textContent = `${username} connected!`;
		chat.appendChild(el);
	}
});
socket.on("chat.disconnected", ({ username }) => {
	if (chat) {
		const el = document.createElement("div");
		el.style.fontSize = "10px";
		el.style.opacity = "0.75";
		el.textContent = `${username} disconnected!`;
		chat.appendChild(el);
	}
});

document.getElementById("leave")?.addEventListener("click", () => {
	socket.emit("chat.disconnect", 0);
});