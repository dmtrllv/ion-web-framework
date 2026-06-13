import { Connection, ConnectionRoute, Service } from "@ion/core";

export class RoomId extends ConnectionRoute {}

export class ChatService extends Service {
	private roomIdCounter = 0;
	private readonly rooms = new Map<number, ChatRoom>();

	public createChatRoom(owner: number, name: string): number {
		const roomId = this.roomIdCounter++;
		this.rooms.set(roomId, new ChatRoom(roomId, owner, name));

		this.app.emit("chatRoomCreated", {
			owner,
			roomId
		}, );

		return roomId;
	}

	public removeChatRoom(owner: number, id: number) {
		const room = this.rooms.get(id);
		if (!room || room.owner !== owner) {
			return false;
		}

		this.rooms.delete(id);

		return true;
	}

	public connect(conn: Connection<any>, room: number) {
		if(this.rooms.has(room)) {
			conn.bind(RoomId.create(room));
			return true;
		}
		return false;
	}

	public disconnect(conn: Connection<any>, roomId: number) {
		const room = this.rooms.get(roomId);

		if (!room)
			return false;

		if (!room.connections.has(conn))
			return false;

		room.connections.delete(conn);

		this.app.emit("chatDisconnected", { roomId, username: "Client." + conn.id });

		return true;
	}

	public sendMessage(_roomId: number, _user: number, _message: string) {
		//const room = this.rooms.get(roomId);
		//if (room) {
		//	this.app.emit("broadcastMessage", { roomId: roomId, username: "Client." + user, message, userIds: Array.from(room.clients.values()) });
		//}
	}
}

class ChatRoom {
	readonly id: number;
	readonly owner: number;
	readonly name: string;
	readonly connections: Set<Connection<any>> = new Set();

	public constructor(id: number, owner: number, name: string) {
		this.id = id;
		this.owner = owner;
		this.name = name;
	}
}