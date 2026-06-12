import { IncomingMessage } from "http";
import { WsSchema } from "./schema.js";
import { Socket } from "./socket.js";
import { Duplex } from "stream";
import { ClientEvent, ServerEvent } from "./client.js";
import { BROADCAST, EMIT, SEND, ServerEventResponse, WsController, WsControllerType, WsTransport } from "./transport.js";
import { App, ControllerType, EventBinding } from "@ion/core";

export class WsEndpoint<Path extends string, T extends WsSchema> {
	public readonly path: Path;
	public readonly schema: T;
	public readonly eventHandlers: EventHandlers<T>;

	private readonly namespaceMap = new Map<WsControllerType<any>, string>();

	private readonly sockets: Map<number, Socket> = new Map();
	private readonly onConnection: ConnectionCallback;

	private socketIdCounter: number = 0;

	public constructor(path: Path, schema: T, onConnectionCallback: ConnectionCallback = () => true) {
		this.path = path;
		this.schema = schema;
		this.eventHandlers = this.resolveEventHandlers(schema);
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
				this.namespaceMap.set(target, prefixes.join("."));
			} else {
				for (const k in target) {
					walk([...prefixes, k], target[k] as WsSchema);
				}
			}
		};

		walk([], schema);

		return flat as EventHandlers<T>;
	}

	private resolveControllerNamespace(controller: WsControllerType<any>) {
		const namespace = this.namespaceMap.get(controller);
		if (!namespace)
			throw new Error(`Could not get namespace for WsController ${controller.name}!`);
		return namespace;
	}

	private resolveEventName(controller: WsControllerType<any>, method: string) {
		return [this.resolveControllerNamespace(controller), method].join(".");
	}

	public async connect(app: App, req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>): Promise<boolean> {
		if (!await this.onConnection(req, socket, head))
			return false;
		const id = this.socketIdCounter++;
		this.sockets.set(id, new Socket(app, id, socket, this));
		socket.on("close", () => {
			this.sockets.delete(id);
		});
		socket.on("error", (err) => {
			if("code" in err && err.code === "ECONNABORTED") {
				// ?
			} else {
				console.log(err);
			}
		});
		return true;
	}

	public resolveClientEventHandler(event: ClientEvent<T>): EventHandler {
		return this.eventHandlers[event];
	}

	public async resolveServerEvent(c: WsController, data: any, { controller, method }: EventBinding<ControllerType<WsTransport, IncomingMessage, never>>) {
		const eventName = this.resolveEventName(controller, method);
		const result = await (c[method] as Function)(data) as ServerEventResponse<any>;
		switch (result.type) {
			case SEND:
				result.target.emitEvent(eventName, data);
				break;
			case EMIT:
				this.sockets.forEach(s => s.emitEvent(eventName, data));
				break;
			case BROADCAST:
				this.sockets.forEach(s => (s !== result.source) && s.emitEvent(eventName, data))
				break;
		}
	}
}

export type EventHandlers<T extends WsSchema> = Record<ClientEvent<T>, EventHandler>;
export type EventEmitters<T extends WsSchema> = Record<ServerEvent<T>, EventHandler>;

type EventHandler = {
	controller: WsControllerType<any>;
	key: string;
};

type ConnectionCallback = (req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>) => boolean | Promise<boolean>;