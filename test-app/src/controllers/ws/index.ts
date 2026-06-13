import { WsEndpoint } from "@ion/ws";
import { ChatController } from "./chat.js";

const onConnection = () => {
	// TODO: maybe have a way to inject configured context? like an authenticated session context?
	return true;
};

export const wsEndpoint = new WsEndpoint("/ws", {
	chat: ChatController,
}, onConnection);

export type MainWsEndpoint = typeof wsEndpoint;