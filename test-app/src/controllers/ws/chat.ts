import { App, service, type DomainEventData } from "@ion/core";
import { clientEvent,  send, WsConnection, WsController } from "@ion/ws";
import { ChatService } from "../../services/chat.js";

export class ChatController extends WsController {
	@service()
	public readonly chatService!: ChatService;

	@App.onEvent("broadcastMessage")
	public broadcastMessage({ username, message }: DomainEventData<"broadcastMessage">) {
		return send({ username, message });
	}

	@App.onEvent("chatConnected")
	public connected({ username }: DomainEventData<"chatConnected">) {
		return send({ username });
	}

	@App.onEvent("chatDisconnected")
	public disconnected({ username }: DomainEventData<"chatDisconnected">) {
		return send({ username });
	}

	@clientEvent()
	public connect(conn: WsConnection<any>, room: number) {
		this.chatService.connect(conn, room);
	}

	@clientEvent()
	public message(_: WsConnection<any>, { room, message }: { room: number, message: string }) {
		//const user = conn.use(Session)?.user;
		//if (user) {	
			this.chatService.sendMessage(room, 0, message);
		//}
	}
}