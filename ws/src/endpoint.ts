import { IncomingMessage } from "http";
import { WsSchema } from "./schema.js";
import { Socket } from "./socket.js";
import { Duplex } from "stream";
import { ClientEvent, ServerEvent } from "./client.js";
import { WsControllerType, WsTransport } from "./transport.js";
import { App } from "@ion/core";

export class WsEndpoint<Path extends string, T extends WsSchema> {

	public readonly path: Path;
	public readonly eventHandlers: EventHandlers<T>;
	//public readonly eventEmitters: EventEmitters<T>;

	private readonly sockets: Map<number, Socket> = new Map();
	private readonly onConnection: ConnectionCallback;

	private socketIdCounter: number = 0;

	public constructor(path: Path, schema: T, onConnectionCallback: ConnectionCallback = () => true) {
		this.path = path;
		this.eventHandlers = this.resolveEventHandlers(schema);
		//this.eventEmitters = this.resolveEventEmitters(schema);
		this.onConnection = onConnectionCallback;
	}

	private resolveEventHandlers<T extends WsSchema>(schema: T): EventHandlers<T> {
		let flat: Record<string, EventHandler> = {};

		const walk = (prefixes: string[], target: WsSchema | WsControllerType<any>) => {
			if (typeof target === "function") {
				const handlers = WsTransport.getClientEventHandlers(target);
				handlers.forEach(key => {
					const event = [...prefixes, key].join(".");
					flat[event] = { controller: target, key }
				});
			} else {
				for (const k in target) {
					walk([...prefixes, k], target[k] as WsSchema);
				}
			}
		};

		walk([], schema);

		return flat as EventHandlers<T>;
	}

	//private resolveEventEmitters<T extends WsSchema>(schema: T): EventEmitters<T> {
	//	let flat: Record<string, EventHandler> = {};

	//	const walk = (prefixes: string[], target: WsSchema | WsControllerType<any>) => {
	//		if (typeof target === "function") {
	//			const handlers = WsTransport.getServerEventHandlers(target);
	//			handlers.forEach(key => {
	//				const event = [...prefixes, key].join(".");
	//				flat[event] = { controller: target, key }
	//			});
	//		} else {
	//			for (const k in target) {
	//				walk([...prefixes, k], target[k] as WsSchema);
	//			}
	//		}
	//	};

	//	walk([], schema);

	//	return flat as EventEmitters<T>;
	//}


	public async connect(app: App, req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>): Promise<boolean> {
		if (!await this.onConnection(req, socket, head))
			return false;
		const id = this.socketIdCounter++;
		this.sockets.set(id, new Socket(app, id, socket, this));
		return true;
	}

	public resolveClientEventHandler(event: ClientEvent<T>): EventHandler {
		return this.eventHandlers[event];
	}

	//public resolveServerEventEmitter(event: ServerEvent<T>): EventHandler {
	//	return this.eventEmitters[event];
	//}
}

export type EventHandlers<T extends WsSchema> = Record<ClientEvent<T>, any>;
export type EventEmitters<T extends WsSchema> = Record<ServerEvent<T>, any>;

type EventHandler = {
	controller: WsControllerType<any>;
	key: string;
};

type ConnectionCallback = (req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>) => boolean | Promise<boolean>;