import { Connection, ConnectionRegistry } from "@ion/core";
import { Socket } from "./socket.js";
import { WsTransport } from "./transport.js";

export class WsConnection<T extends Record<string, any> = Record<string, any>> extends Connection<T> {
	private readonly socket: Socket;
	
	public constructor(registry: ConnectionRegistry<T>, transport: WsTransport, id: number, socket: Socket) {
		super(registry, transport, id);
		this.socket = socket;
	}

	override emit<K extends keyof T>(event: K, payload: T[K]): EmitResult {
		this.socket.emitEvent(event as any, payload as never);
		return { [EMIT]: EMIT };
	}
}

export const EMIT = Symbol();

export type EmitResult = { [EMIT]: typeof EMIT };