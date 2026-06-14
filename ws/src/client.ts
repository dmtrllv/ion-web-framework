//import type { WsEndpoint } from "./endpoint.js";
//import type { WsSchema } from "./schema.js";
//import { ServerEventResponse, WsController, WsControllerType } from "./transport.js";

//type WsEndpointPath<T extends WsEndpoint<any, any>> = T extends WsEndpoint<infer Path, any> ? Path : never;
//type WsEndpointSchema<T extends WsEndpoint<any, any>> = T extends WsEndpoint<any, infer Schema> ? Schema : never;

//type ClientSocket<T extends WsEndpoint<any, any>> = Socket<WsEndpointSchema<T>>;

//export class WsClient<T extends WsEndpoint<any, any>> {
//	private socket: ClientSocket<T> | null = null;
//	private connectingPromise: Promise<ClientSocket<T>> | null = null;

//	public readonly path: WsEndpointPath<T>;
//	public readonly host: string;

//	public constructor(path: WsEndpointPath<T>, host: string = window.location.host) {
//		this.path = path;
//		this.host = host;
//	}

//	public connect(): Promise<ClientSocket<T>> {
//		if (this.socket !== null)
//			return Promise.resolve(this.socket);

//		if (this.connectingPromise)
//			return this.connectingPromise;

//		this.connectingPromise = new Promise((res, rej) => {
//			const ws = new WebSocket(`ws://${this.host}${this.path}`);
//			ws.onopen = () => {
//				this.socket = new Socket(ws);
//				this.connectingPromise = null;
//				res(this.socket);
//			};
//			ws.onerror = (e) => {
//				this.connectingPromise = null;
//				rej(e);
//			};
//			ws.onclose = () => {
//				if (this.socket) {
//					this.socket = null;
//				}
//			};
//			ws.onmessage = (e) => {
//				if (this.socket)
//					this.socket.onMessage(e.data);
//			}
//		});

//		return this.connectingPromise;
//	}
//};

//export class Socket<T extends WsSchema> {
//	private readonly ws: WebSocket;
//	private readonly eventHandlers: Map<keyof ServerEventMap<T>, Function[]> = new Map();

//	public constructor(ws: WebSocket) {
//		this.ws = ws;
//	}

//	public emit<E extends string>(event: E, data: any) {
//		this.ws.send(JSON.stringify({ event, data }))
//	}

//	public on<E extends keyof ServerEventMap<T>>(event: E, callback: (data: ServerEventMap<T>[E]) => any) {
//		if (!this.eventHandlers.has(event)) {
//			this.eventHandlers.set(event, []);
//		}
//		this.eventHandlers.get(event)!.push(callback);
//	}

//	public remove<E extends keyof ServerEventMap<T>>(event: E, callback: (data: ServerEventMap<T>) => any) {
//		const handlers = this.eventHandlers.get(event) || [];
//		const i = handlers.indexOf(callback);
//		if (i > -1) {
//			handlers.splice(i, 1);
//		}
//	}

//	public close(code?: number, reason?: string) {
//		this.ws.close(code, reason);
//	}

//	public onMessage(data: string | Buffer<ArrayBuffer>) {
//		if (typeof data === "string") {
//			try {
//				const json = JSON.parse(data);
//				if ("event" in json) {
//					this.eventHandlers.get(json.event)?.forEach(handler => {
//						handler(json.data);
//					});
//				}
//			} catch {
//				console.warn("Could not parse websocket data!");
//			}
//		} else {
//			console.warn("TODO parse binary blob?");
//		}
//	}
//}

//type WsControllerServerEventKeys<T extends WsController> = {
//	[K in keyof T]: K extends string ? K : never;
//}[keyof T];

//type ServerEventKeys<T extends WsSchema> = {
//	[K in keyof T]:
//	K extends string ? (
//		T[K] extends WsControllerType<infer C> ? `${K}.${WsControllerServerEventKeys<C>}` :
//		T[K] extends WsSchema ? `${K}.${ServerEventKeys<T[K]>}` :
//		never
//	) : never;
//}[keyof T];

//export type ServerEventMap<T extends WsSchema> = {
//	readonly [K in ServerEventKeys<T>]: ServerEventData<T, K>;
//};

//type ServerEventData<T, K extends string> =
//	K extends `${infer First}.${infer Rest extends string}` ? (
//		First extends keyof T ? (
//			T[First] extends WsControllerType<infer C> ? ServerControllerEventData<C, Rest> :
//			T[First] extends WsSchema ? ServerEventData<T[First], Rest> : never
//		) : never
//	) : never;

//type ServerControllerEventData<T extends WsController, K> = K extends keyof T ? (
//	T[K] extends (...args: any[]) => ServerEventResponse<infer R> ? R : never
//) : never;
////T extends WsControllerType<infer C> ? (K extends keyof C ? (C[K] extends () => infer R ? R : never) : never) :
////K extends `${infer First}.${infer Rest}` ? First extends keyof T ? ServerEventData<T[First], Rest> : never :
////never;


import type { WsEndpoint } from "./endpoint.js";
import type { WsSchema } from "./schema.js";
import { ServerEventResponse, WsController, WsControllerType } from "./transport.js";

type WsEndpointPath<T extends WsEndpoint<any, any>> = T extends WsEndpoint<infer Path, any> ? Path : never;

type WsEndpointSchema<T extends WsEndpoint<any, any>> = T extends WsEndpoint<any, infer Schema> ? Schema : never;

export class WsClient<T extends WsEndpoint<any, any>> {
	private socket: Socket<WsEndpointSchema<T>> | null = null;
	private connectingPromise: Promise<Socket<WsEndpointSchema<T>>> | null = null;

	public readonly path: WsEndpointPath<T>;
	public readonly host: string;

	public constructor(path: WsEndpointPath<T>, host: string = window.location.host) {
		this.path = path;
		this.host = host;
	}

	public connect(): Promise<Socket<WsEndpointSchema<T>>> {
		if (this.socket) return Promise.resolve(this.socket);
		if (this.connectingPromise) return this.connectingPromise;

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
				this.socket = null;
			};

			ws.onmessage = (e) => {
				this.socket?.onMessage(e.data);
			};
		});

		return this.connectingPromise;
	}
}

export class Socket<T extends WsSchema> {
	private readonly ws: WebSocket;

	private readonly eventHandlers = new Map<string, Function[]>();

	public constructor(ws: WebSocket) {
		this.ws = ws;
	}

	public emit(event: string, data: any) {
		this.ws.send(JSON.stringify({ event, data }));
	}

	public on<E extends ServerEventKeys<T>>(
		event: E,
		callback: (data: ResolveEventData<T, E>) => any
	) {
		const handlers = this.eventHandlers.get(event) ?? [];
		handlers.push(callback);
		this.eventHandlers.set(event, handlers);
	}

	public remove<E extends string>(
		event: E,
		callback: (data: ResolveEventData<T, E>) => any
	) {
		const handlers = this.eventHandlers.get(event);
		if (!handlers)
			return;

		const i = handlers.indexOf(callback);
		if (i !== -1) handlers.splice(i, 1);
	}

	public close(code?: number, reason?: string) {
		this.ws.close(code, reason);
	}

	public onMessage(data: string | Buffer<ArrayBuffer>) {
		if (typeof data !== "string")
			return;

		try {
			const json = JSON.parse(data);

			if (!json?.event)
				return;

			const handlers = this.eventHandlers.get(json.event);
			console.log(json.event, json.data, handlers);
			handlers?.forEach(fn => fn(json.data));

		} catch {
			console.warn("Could not parse websocket data!");
		}
	}
}

// @ts-ignore
type ServerEventKeys<T extends WsSchema> = {
	[K in keyof T]:
	K extends string ? (
		T[K] extends WsControllerType<infer C> ? `${K}.${WsControllerServerEventKeys<C>}` :
		T[K] extends WsSchema ? `${K}.${ServerEventKeys<T[K]>}` :
		never
	) : never;
}[keyof T];


type WsControllerServerEventKeys<T extends WsController> = {
	[K in keyof T]: K extends string ? K : never;
}[keyof T];


// @ts-ignore
type ResolveEventData<T, Path extends string> =
	T extends WsControllerType<infer C> ? (
		Path extends keyof C ? (
			C[Path] extends (...args: any[]) => ServerEventResponse<infer U> ? U : never
		) : never
	) : Path extends `${infer First extends string}.${infer Rest extends string}` ? (
		First extends keyof T ? ResolveEventData<T[First], Rest> : never
	) : never;
