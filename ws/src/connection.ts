import { Connection, ConnectionRegistry } from "@ion/core";
import { Socket } from "./socket.js";
import { WsEndpoint } from "./endpoint.js";
import { ServerEventMap } from "./client.js";
import { WsTransport } from "./transport.js";

export class WsConnection<T extends WsEndpoint<any, any>> extends Connection<WsSeverEvents<T>> {
	private readonly socket: Socket;
	
	public constructor(registry: ConnectionRegistry<WsSeverEvents<T>>, transport: WsTransport, id: number, socket: Socket) {
		super(registry, transport, id);
		this.socket = socket;
	}

	override emit<K extends keyof WsSeverEvents<T>>(event: K, payload: WsSeverEvents<T>[K]): EmitResult {
		this.socket.emitEvent(event as any, payload as never);
		return { [EMIT]: EMIT };
	}
}

export const EMIT = Symbol();

export type EmitResult = { [EMIT]: typeof EMIT };

export type WsSeverEvents<T extends WsEndpoint<any,any>> = ServerEventMap<WsEndpointSchema<T>>;

type WsEndpointSchema<T extends WsEndpoint<any, any>> = T extends WsEndpoint<any, infer Schema> ? Schema : never;