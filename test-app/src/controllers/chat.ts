import { service } from "@ion/core";
import { HttpController, post, route } from "@ion/http";
import { ChatService } from "../services/chat.js";

@route("/chat")
export class ChatController extends HttpController {
	@service()
	public readonly chat!: ChatService;
	
	@post("/create")
	public async createRoom({ name }: { name: string }) {
		const userId = 0; // get from session
		return this.chat.createChatRoom(userId, name);
	}

	@post("/create")
	public async connect({ roomId }: { roomId: number }) {
		const userId = 0; // get from session
		return this.chat.connect(userId, roomId);
	}
}