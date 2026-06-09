import { createWsSchema } from "@ion/ws";
import { UsersController, } from "./users.js";

export const ws = createWsSchema({
	users: UsersController
});