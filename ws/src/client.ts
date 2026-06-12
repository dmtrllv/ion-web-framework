import type { WsEndpoint } from "./endpoint.js";
import type { WsSchema } from "./schema.js";
import type { Broadcast, Emit, Send, ServerEventResponse, WsController, WsControllerType } from "./transport.js";
import type { Socket as ServerSocket } from "./socket.js";

type WsEndpointPath<T extends WsEndpoint<any, any>> = T extends WsEndpoint<infer Path, any> ? Path : never;
type WsEndpointSchema<T extends WsEndpoint<any, any>> = T extends WsEndpoint<any, infer Schema> ? Schema : never;

type ClientSocket<T extends WsEndpoint<any, any>> = Socket<WsEndpointSchema<T>>;

export class WsClient<T extends WsEndpoint<any, any>> {
	private socket: ClientSocket<T> | null = null;
	private connectingPromise: Promise<ClientSocket<T>> | null = null;

	public readonly path: WsEndpointPath<T>;
	public readonly host: string;

	public constructor(path: WsEndpointPath<T>, host: string = window.location.host) {
		this.path = path;
		this.host = host;
	}

	public connect(): Promise<ClientSocket<T>> {
		if (this.socket !== null)
			return Promise.resolve(this.socket);

		if (this.connectingPromise)
			return this.connectingPromise;

		this.connectingPromise = new Promise((res, rej) => {
			const ws = new WebSocket(`ws://${this.host}${this.path}`);
			ws.onopen = () => {
				this.socket = new Socket(ws);
				this.connectingPromise = null;
				res(this.socket);
			};
			ws.onerror = (e) => {
				this.connectingPromise = null;
				rej(e);
			};
			ws.onclose = () => {
				if (this.socket) {
					this.socket = null;
				}
			};
			ws.onmessage = (e) => {
				if (this.socket)
					this.socket.onMessage(e.data);
			}
		});

		return this.connectingPromise;
	}
};

export class Socket<T extends WsSchema> {
	private readonly ws: WebSocket;
	private readonly eventHandlers: Map<string, Function[]> = new Map();

	public constructor(ws: WebSocket) {
		this.ws = ws;
	}

	public emit<E extends ClientEvent<T>>(event: E, ...[data]: [ClientEventData<T, E>]) {
		this.ws.send(JSON.stringify({ event, data }))
	}

	public on<E extends ServerEvent<T>>(event: E, callback: (...args: [ServerEventData<T, E>]) => any) {
		if(!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(callback);
	}

	public remove<E extends ServerEvent<T>>(event: E, callback: (...args: [ServerEventData<T, E>]) => any) {
		const handlers = this.eventHandlers.get(event) || [];
		const i = handlers.indexOf(callback);
		if(i > -1) {
			handlers.splice(i, 1);
		}
	}

	public close(code?: number, reason?: string) {
		this.ws.close(code, reason);
	}

	public onMessage(data: string | Buffer<ArrayBuffer>) {
		if(typeof data === "string") {
			try {
				const json = JSON.parse(data);
				if("event" in json) {
					this.eventHandlers.get(json.event)?.forEach(handler => {
						handler(json.data);
					});
				}
			} catch {
				console.warn("Could not parse websocket data!");
			}
		} else {
			console.warn("TODO parse binary blob?");
		}
	}
}

export type ClientEvent<T extends WsSchema> = {
	[K in keyof T]:
	K extends string ? (
		T[K] extends WsControllerType<infer C> ? `${K}.${ClientControllerEvents<C>}` :
		T[K] extends WsSchema ? `${K}.${ServerEvent<T[K]>}` :
		never
	) : never;
}[keyof T];

type ClientControllerEvents<T extends WsController> = {
	[K in keyof T]: K extends string ? (
		T[K] extends (socket: ServerSocket, ...args: any[]) => (void | Promise<void>) ? K : never
	) : never;
}[keyof T];

export type ClientEventData<T extends WsSchema, E extends ClientEvent<T>, H = PickHandler<T, E>> = H extends (socket: ServerSocket, ...args: [infer Data, ...any[]]) => (void | Promise<void>) ? Data : never;

export type ServerEvent<T extends WsSchema> = {
	[K in keyof T]:
	K extends string ? (
		T[K] extends WsControllerType<infer C> ? `${K}.${ServerControllerEvents<C>}` :
		T[K] extends WsSchema ? `${K}.${ServerEvent<T[K]>}` :
		never
	) : never;
}[keyof T];

type ServerControllerEvents<T extends WsController> = {
	[K in keyof T]: K extends string ? (
		T[K] extends (...args: any[]) => Emit<any> | Broadcast<any> | Send<any> ? K : never
	) : never;
}[keyof T];

type PickHandler<T, E extends string> =
	T extends WsControllerType<infer C> ? (E extends keyof C ? C[E] : never) :
	E extends `${infer First}.${infer Rest extends string}` ? (
		First extends keyof T ? PickHandler<T[First], Rest> : never
	) : never;

export type ServerEventData<T extends WsSchema | WsControllerType<any>, E extends string, H = PickHandler<T, E>> = H extends (...args: any[]) => ServerEventResponse<infer R> ? R : never;
