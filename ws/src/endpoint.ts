import { IncomingMessage } from "http";
import { WsSchema } from "./schema.js";
import { Socket } from "./socket.js";
import { WsControllerType, WsTransport } from "./transport.js";
import { Connection } from "@ion/core";

export class WsEndpoint<Path extends string, T extends WsSchema> {
	public readonly path: Path;
	public readonly schema: T;
	public readonly eventHandlers: EventHandlers<T>;

	private readonly namespaceMap = new Map<WsControllerType<any>, string>();

	private readonly sockets: Map<number, Socket> = new Map();
	private readonly onConnection: ConnectionCallback<T>;

	public constructor(path: Path, schema: T, onConnectionCallback: ConnectionCallback<T> = () => true) {
		this.path = path;
		this.schema = schema;
		this.eventHandlers = this.resolveEventHandlers(schema);
		this.onConnection = onConnectionCallback;
	}

	public hasConnectionId(id: number): boolean {
		return this.sockets.has(id);
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

	public resolveEventName(controller: WsControllerType<any>, method: string) {
		return [this.resolveControllerNamespace(controller), method].join(".");
	}

	public async connect(req: IncomingMessage, id: number, socket: Socket<T>, head: Buffer<ArrayBuffer>, connection: Connection<T>): Promise<boolean> {
		if (!await this.onConnection(req, socket, head, connection))
			return false;

		this.sockets.set(id, socket);

		return true;
	}

	public disconnect(id: number) {
		this.sockets.delete(id);
	}

	public resolveClientEventHandler(event: string): EventHandler | null {
		return this.eventHandlers[event] || null;
	}
}

export type EventHandlers<_T extends WsSchema> = Record<string, EventHandler>;
export type EventEmitters<_T extends WsSchema> = Record<string, EventHandler>;

type EventHandler = {
	controller: WsControllerType<any>;
	key: string;
};

export type ConnectionCallback<T extends WsSchema> = (req: IncomingMessage, socket: Socket<T>, head: Buffer<ArrayBuffer>, connection: Connection<T>) => boolean | Promise<boolean>;