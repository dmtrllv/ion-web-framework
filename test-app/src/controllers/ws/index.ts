import { WsEndpoint } from "@ion/ws";
import { ChatController } from "./chat.js";

export const wsEndpoint = new WsEndpoint("/ws", {
	chat: ChatController,
});


export type MainWsEndpoint = typeof wsEndpoint;