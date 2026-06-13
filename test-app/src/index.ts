import { App } from "@ion/core";
import { HttpTransport } from "@ion/http";
import { WsTransport } from "@ion/ws";
import { api } from "./controllers/index.js";
import { resolve } from "node:path";
import { wsEndpoint } from "./controllers/ws/index.js";
//import { IncomingMessage } from "node:http";

export const app = new App();

const httpServer = app.use(HttpTransport, {
	api,
	public: {
		path: [
			resolve("public"),
			resolve("../node_modules"),
			{
				path: resolve("dist/client"),
				prefix: "/js" // expose the files and folders at dist/client prefixed with /js (so /js/index.js resolves to dist/client/index.js)
			},
		],
		resolveHtml: true,
	}
});

//const parseSession = (_req: IncomingMessage): { username: string } | null => {
//	return null;
//};

app.use(WsTransport, {
	server: httpServer,
	endpoints: [wsEndpoint],
});

await app.start();