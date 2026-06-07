import { createApi } from "@ion/http";
import { UsersController } from "./users.js";

export const api = createApi("/api", {
	users: UsersController
});