import { api } from "./api.js";

import "./home.js";

const users = document.getElementById("users-list");

const addUser = (id: number, name: string) => {
	const el = document.createElement("div");
	el.innerText = `${id} - ${name}`;
	users?.appendChild(el);
};

const res2 = await api.users.all();

if (res2.error) {
	console.error(res2.error);
} else {
	res2.data.forEach(({ id, name }) => addUser(id, name));
}

const btn = document.getElementById("add-user-btn");
if (btn) {
	btn.onclick = async () => {
		const name = "test" + Math.floor(Math.random() * 10000).toString();
		const res = await api.users.create(name);

		if (res.error) {
			console.error(res.error);
		} else {
			addUser(res.data, name);
		}
	}
}

api.users.queried({ a: 1, b: 2, c: [1, 2, 3] });