import { App, service, type DomainEventData } from "@ion/core";
import { clientEvent, send, WsConnection, WsController } from "@ion/ws";
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
		this.chatService.connect(conn, conn.id, room);
	}

	@clientEvent()
	public disconnect(conn: WsConnection<any>, room: number) {
		this.chatService.disconnect(conn, conn.id, room);
	}

	@clientEvent()
	public message(conn: WsConnection<any>, { room, message }: { room: number, message: string }) {
		this.chatService.sendMessage(conn, room, conn.id, message);
	}
}