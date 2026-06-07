import { App } from "@ion/core";
import { HttpTransport } from "@ion/http";
import { api } from "./http/index.js";

export const app = new App();

app.use(HttpTransport, {
	api
});

await app.start();