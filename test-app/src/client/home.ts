import { createRoot, div, h1 } from "./ui.js";

const state = <T extends {}>(val: T): T => new Proxy(val, {
	get(target: any, p) {
		return target[p];
	},
	set(target: any, p, newValue) {
		target[p] = newValue;
		return true;
	},
})

const title = (text: string) => {
	const title = state({ text });

	return h1({
		onclick: () => title.text += "!",
	}, title.text);
};

const app = () => {
	const onclick = () => console.log("App clicked!");

	return div({ id: "app", onclick },
		title("hello")
	);
};

createRoot(document.body).render(app);