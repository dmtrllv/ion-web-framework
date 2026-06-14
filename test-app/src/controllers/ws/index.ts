import { ConnectionCallback, WsEndpoint } from "@ion/ws";
import { ChatController } from "./chat.js";
import { Session } from "./session.js";

const onConnection: ConnectionCallback<any> = async (req, _socket, _head, conn) => {
	// load session from req and check permissions
	const session = await Session.from(req);
	
	if (session) {
		conn.use(Session, session);
		return true;
	}
	return false;
};

export const wsEndpoint = new WsEndpoint("/ws", {
	chat: ChatController,
}, onConnection);

export type MainWsEndpoint = typeof wsEndpoint;