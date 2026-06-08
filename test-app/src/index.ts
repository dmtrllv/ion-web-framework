import { App } from "@ion/core";
import { HttpTransport } from "@ion/http";
import { api } from "./http/index.js";
import { resolve } from "node:path";

export const app = new App();

app.use(HttpTransport, {
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

await app.start();