import { createApi } from "@ion/http";
import { UsersController } from "./users.js";
import { AuthController } from "./auth.js";

export const api = createApi("/api", {
	users: UsersController,
	auth: AuthController,
});	

export type ServerApi = typeof api;