import { App, service, type DomainEventData } from "@ion/core";
import { clientEvent, emit, serverEvent, Socket, WsController } from "@ion/ws";
import { ChatService } from "../../services/chat.js";

export class ChatController extends WsController {
	@service()
	public readonly chatService!: ChatService;

	// todo: implement
	// @socket()
	// public readonly socket: Socket;
	// and
	//@session() -> should be defined in core, needs to work for http tooewqa
	//public readonly session: Session;

	@App.onEvent("broadcastMessage")
	@serverEvent()
	public broadcastMessage({ username, message }: DomainEventData<"broadcastMessage">) {
		return emit({
			username,
			message
		});
	}

	@clientEvent()
	public message(socket: Socket, message: string) {
		// todo get room id from socket
		const roomId = socket.id;
		this.chatService.sendMessage(roomId, 1, message);
	}
}