import { Transport, UpgradableTransport } from "@ion/core";
import { createHash } from "node:crypto";
import { IncomingMessage } from "node:http";
import { Duplex } from "node:stream";
import { Socket } from "./socket.js";
import { WsEndpoint } from "./endpoint.js";

/**
 * TODO:
 * a way to get endpoints, seperate sockets, session trough decorators
 * this will allow for emitting data back to the clients since after the ws called
 * into the domain/application the origin info is lost and the core will emit events separate
 * from the websockets instances. 
 */

export class WsTransport extends Transport<IncomingMessage, never> {
	//private static readonly serverEventHandlers = new Map<WsControllerType<any>, string[]>();
	private static readonly clientEventHandlers = new Map<WsControllerType<any>, string[]>();

	public static readonly serverEvent = <T extends WsController, K extends keyof T>() => (_target: T, _key: K, descriptor: PropertyDescriptor): ServerEventCheck<T, K> => {
		const original = descriptor.value;

		descriptor.value = async function (this: any, ...args: any[]) {
			// inject endpoint?
			const result = await original.apply(this, args);
			console.log("send event to client ", result, this, args);
			return result;
		};

		return descriptor as any as ServerEventCheck<T, K>;
	}

	public static readonly clientEvent = <T extends WsController, K extends keyof T>() => (target: T, key: K): ClientEventCheck<T, K> => {
		const ctor = target.constructor as WsControllerType<any>;
		if (!this.clientEventHandlers.has(ctor)) {
			this.clientEventHandlers.set(ctor, []);
		}
		this.clientEventHandlers.get(ctor)!.push(key.toString());
		return void (0) as ClientEventCheck<T, K>;
	}

	//public static getServerEventHandlers(controller: WsControllerType<any>) {
	//	return this.serverEventHandlers.get(controller) || [];
	//}

	public static getClientEventHandlers(controller: WsControllerType<any>) {
		return this.clientEventHandlers.get(controller) || [];
	}

	private static readonly GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

	private static readonly createAcceptValue = (secWebSocketKey: string) => {
		return createHash("sha1")
			.update(secWebSocketKey + WsTransport.GUID, "binary")
			.digest("base64");
	}

	//@ts-ignore
	private onConnection?: ConnectionHandler;
	//@ts-ignore
	private onClosed?: ClosedHandler;

	private readonly endpoints: Map<string, WsEndpoint<any, any>> = new Map();

	public override configure(config: WsTransportConfig): void | Promise<void> {
		config.server.onUpgrade(this.onUpgrade);
		const e = Array.isArray(config.endpoints) ? config.endpoints : [config.endpoints];
		e.forEach(e => this.endpoints.set(e.path, e));
	}

	private readonly onUpgrade = async (req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>) => {
		const reject = (reason: string) => {
			console.error(reason);
			socket.destroy();
		};

		if (req.headers.upgrade !== "websocket") {
			return reject("Not a websocket!");
		}

		const version = req.headers["sec-websocket-version"];
		if (version !== "13") {
			return reject(`Wrong got version ${version} but expected version 13!`);
		}

		const key = req.headers["sec-websocket-key"];

		if (!key) {
			return reject("Missing header \"sec-websocket-key\"!");
		}

		const endpoint = this.endpoints.get(req.url || "/");

		if (!endpoint) {
			return reject("Could not find endpoint!");
		}

		if (this.onConnection) {
			if (!await this.onConnection(req, socket)) {
				return reject("Not allowed to connect!");
			}
		}

		if (!await endpoint.connect(this.app, req, socket, head)) {
			return reject("Not allowed to connect!");
		}

		const acceptKey = WsTransport.createAcceptValue(key);

		socket.write(
			"HTTP/1.1 101 Switching Protocols\r\n" +
			"Upgrade: websocket\r\n" +
			"Connection: Upgrade\r\n" +
			`Sec-WebSocket-Accept: ${acceptKey}\r\n` +
			"\r\n"
		);
	}
}

export const WsController = WsTransport.Controller();

export type WsControllerCtor = typeof WsController;
export type WsController = InstanceType<typeof WsController>;
export type WsControllerType<T extends WsController> = new (...args: any[]) => T;


export type WsUpgradeArgs = [req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>];

export type WsTransportConfig = {
	server: UpgradableTransport<WsUpgradeArgs>;
	endpoints: WsEndpoint<any, any> | WsEndpoint<any, any>[];
	onConnection?: ConnectionHandler;
	onClosed?: ClosedHandler;
};

type ConnectionHandler = (req: IncomingMessage, socket: Duplex) => boolean | Promise<boolean>;
type ClosedHandler = (req: IncomingMessage, socket: Socket<any>) => void | Promise<void>;


export const serverEvent = WsTransport.serverEvent;
export const clientEvent = WsTransport.clientEvent;

type ServerEventCheck<T extends WsController, K extends keyof T> = T[K] extends (...args: any[]) => ServerEventResponse<any> ? void : "ERROR!?!?";

type ClientEventCheck<T extends WsController, K extends keyof T> = T[K] extends (socket: Socket, ...args: any[]) => (void | Promise<void>) ? void : "ERROR!?!?";

export type ServerEventResponse<T> = Emit<T> | Broadcast<T> | Send<T> | Promise<Emit<T> | Broadcast<T> | Send<T>>;

export const EMIT = Symbol();

export type Emit<T> = {
	type: typeof EMIT;
	data: T;
};

export const BROADCAST = Symbol();

export type Broadcast<T> = {
	type: typeof BROADCAST;
	source: Socket;
	data: T;
};

export const SEND = Symbol();

export type Send<T> = {
	type: typeof SEND;
	target: Socket;
	data: T;
};

export const emit = <T>(data: T): Emit<T> => ({ data, type: EMIT });
export const broadcast = <T>(source: Socket, data: T): Broadcast<T> => ({ source, data, type: BROADCAST });
export const send = <T>(target: Socket, data: T): Send<T> => ({ target, data, type: SEND });
