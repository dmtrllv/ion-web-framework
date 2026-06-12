import { App, service, type DomainEventData } from "@ion/core";
import { clientEvent, emit, serverEvent, Socket, WsController } from "@ion/ws";
import { ChatService } from "../../services/chat.js";

export class ChatController extends WsController {
	@service()
	public readonly chatService!: ChatService;

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
		this.chatService.sendMessage(0, socket.id, message);
	}
}