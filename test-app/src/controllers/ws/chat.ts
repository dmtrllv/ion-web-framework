import { App, service, type DomainEventData } from "@ion/core";
import { Socket, WsController } from "@ion/ws";
import { ChatService } from "../../services/chat.js";

export class ChatController extends WsController {
	@service()
	public readonly chatService!: ChatService;

	@App.onEvent("broadcastMessage")
	public emitMessage(_data: DomainEventData<"broadcastMessage">) {
		
	}

	public onMessage(_socket: Socket, _message: string) {
		// todo get user from socket

	}
}