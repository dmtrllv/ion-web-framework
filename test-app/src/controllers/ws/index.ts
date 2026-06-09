import { createServerSchema } from "@ion/ws";
import { ChatController } from "./chat.js";

export const chatSchema = createServerSchema("/chat/:id", {
	chat: ChatController
});

export type ChatSchema = typeof chatSchema;