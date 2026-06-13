import { api } from "./api.js";
import { ws } from "./ws.js";

const socket = await ws.connect();

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

const addMessage = (user: string, msg: string) => {
	if (chat) {
		const el = document.createElement("div");
		el.style.color = getColor(user);
		el.textContent = `${user}: ${msg}`;
		chat.appendChild(el);
	}
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
	addMessage(username, message);
});

const room = await api.chat.createRoom({ name: "foo-bar" });
if (room.data !== undefined) {
	const x = await api.chat.connect({ roomId: room.data });
	if (x.data === true) {
		console.log("connected to room foo-bar with roomId:", room.data);
	}
}