import { Socket, ws, WsController } from "@ion/ws";

export class UsersController extends WsController {
	@ws("notifyOnline")
	public notifyOnline(socket: Socket) {
		socket.broadcast({
			event: "userOnline",
			data: socket.id,
		});
	}

	@ws("notifyOffline")
	public notifyOffline(socket: Socket) {
		socket.broadcast({
			event: "userOffline",
			data: socket.id,
		});
	}
}