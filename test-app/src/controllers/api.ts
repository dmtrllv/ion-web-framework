import { createApi } from "@ion/http";
import { UsersController } from "./users.js";
import { AuthController } from "./auth.js";
import { ChatController } from "./chat.js";

export const api = createApi("/api", {
	users: UsersController,
	auth: AuthController,
	chat: ChatController,
});	

export type ServerApi = typeof api;