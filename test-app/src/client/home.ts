//import { createRoot, div, h1 } from "./ui.js";

import { ws } from "./ws.js";

ws.on("userOnline", (id) => {
	console.log("User online ", id);
});

ws.on("userOffline", (id) => {
	console.log("User offline ", id);
});

ws.emit("notifyOnline");

ws.onClose(() => {
	ws.emit("notifyOffline");
});

//const state = <T extends {}>(val: T): T => new Proxy(val, {
//	get(target: any, p) {
//		return target[p];
//	},
//	set(target: any, p, newValue) {
//		target[p] = newValue;
//		return true;
//	},
//})

//const title = (text: string) => {
//	const title = state({ text });

//	return h1({
//		onclick: () => title.text += "!",
//	}, title.text);
//};

//const app = () => {
//	const onclick = () => console.log("App clicked!");

//	return div({ id: "app", onclick },
//		title("hello")
//	);
//};

//createRoot(document.body).render(app);
