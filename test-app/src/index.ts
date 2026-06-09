import { App } from "@ion/core";
import { HttpTransport } from "@ion/http";
import { WsTransport } from "@ion/ws";
import { api } from "./controllers/index.js";
import { resolve } from "node:path";
import { ws } from "./controllers/ws/index.js";

export const app = new App();

const httpServer = app.use(HttpTransport, {
	api,
	public: {
		path: [
			resolve("public"),
			{
				path: resolve("dist/client"),
				prefix: "/js"
			},
			resolve("../node_modules"),
		],
		resolveHtml: true,
	}
});

app.use(WsTransport, {
	server: httpServer,
	schema: ws,
});

await app.start();

app.emit("test");