import { Connection, ConnectionRoute, Id, Service } from "@ion/core";
import { User } from "../entities/user.js";
import { Session } from "../controllers/ws/session.js";

export class RoomId extends ConnectionRoute { }

export class ChatService extends Service {
	private roomIdCounter = 0;
	private readonly rooms = new Map<number, ChatRoom>();

	public createChatRoom(owner: User, name: string, roomId: number = this.roomIdCounter): number {
		console.log("Create chat room ", roomId);
		this.roomIdCounter = roomId + 1;
		this.rooms.set(roomId, new ChatRoom(roomId, owner.id, name));
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

	public connect(conn: Connection<any>, user: User, roomId: number) {
		console.log("connecting to ", roomId);

		let room = this.rooms.get(roomId);

		if (!room) {
			roomId = this.createChatRoom(user, `Room 1 2 3`, roomId);
			room = this.rooms.get(roomId);
		}

		if (room?.connect(conn, () => { this.disconnect(conn, roomId) })) {
			console.log("connected to ", roomId);
			this.app.emit("chatConnected", { room: roomId, username: user.username });
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

		room.disconnect(conn);

		const session = conn.use(Session);
		
		if (session.user)
			this.app.emit("chatDisconnected", { username: session.user.username, room: roomId });

		return true;
	}

	public sendMessage(conn: Connection<any>, roomId: number, user: User, message: string) {
		const room = this.rooms.get(roomId);
		if (room && room.connections.has(conn)) {
			this.app.emit("broadcastMessage", { room: roomId, username: user.username, message }, room.id);
		}
	}
}

class ChatRoom {
	readonly id: RoomId;
	readonly owner: Id<User>;
	readonly name: string;
	readonly connections: Map<Connection<any>, any> = new Map();

	public constructor(id: number, owner: Id<User>, name: string) {
		this.id = RoomId.create(id);
		this.owner = owner;
		this.name = name;
	}

	public connect(conn: Connection<any>, onDisconnected: () => void): boolean {
		this.connections.set(conn, () => {
			onDisconnected();
			this.disconnect(conn);
		});
		conn.bind(this.id);
		conn.on("disconnect", onDisconnected);
		return true;
	}

	public disconnect(conn: Connection<any>) {
		conn.unbind(this.id);
		const disconnectHandler = this.connections.get(conn);
		if (disconnectHandler)
			conn.remove("disconnect", disconnectHandler);
		this.connections.delete(conn);
	}
}