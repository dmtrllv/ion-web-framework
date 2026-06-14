import { WsEndpoint } from "@ion/ws";
import { ChatController } from "./chat.js";

const onConnection = () => {
	return true;
};

export const wsEndpoint = new WsEndpoint("/ws", {
	chat: ChatController,
}, onConnection);

export type MainWsEndpoint = typeof wsEndpoint;