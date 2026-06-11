import { Service } from "@ion/core";

export class ChatService extends Service {
	private roomIdCounter = 0;
	private readonly rooms = new Map<number, ChatRoom>();

	public createChatRoom(owner: number, name: string) {
		const id = this.roomIdCounter++;
		this.rooms.set(id, {
			id,
			owner,
			name,
			clients: new Set()
		});
	}

	public removeChatRoom(user: number, id: number) {
		const room = this.rooms.get(id);
		if (room?.owner !== user) {
			return false;
		}

		this.rooms.delete(id);

		return true;
	}

	public connect(user: number, room: number) {
		return this.rooms.get(room)?.clients.add(user) !== undefined;
	}

	public disconnect(user: number, roomId: number) {
		const room = this.rooms.get(roomId);

		if (!room)
			return false;

		if (!room.clients.has(user))
			return false;

		room.clients.delete(user);

		// TODO: username...
		this.app.emit("chatDisconnected", { chatRoom: roomId, username: "Tod ooo" + user })

		return true;
	}

	public sendMessage(roomId: number, user: number, message: string) {
		// TODO: check if client is a client of the room and has permissions...
		this.app.emit("broadcastMessage", { chatRoom: roomId, username: "Tod ooo" + user, message, userId: 1 });
	}
}

type ChatRoom = {
	readonly id: number;
	readonly owner: number;
	readonly name: string;
	readonly clients: Set<number>;
}