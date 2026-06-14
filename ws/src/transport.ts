import { Connection, ControllerType, DomainEvents, EventBinding, Transport, UpgradableTransport } from "@ion/core";
import { createHash } from "node:crypto";
import { IncomingMessage } from "node:http";
import { Duplex } from "node:stream";
import { Socket } from "./socket.js";
import { WsEndpoint } from "./endpoint.js";
import { WsConnection } from "./connection.js";

export class WsTransport extends Transport<IncomingMessage, never> {
	private static readonly clientEventHandlers = new Map<WsControllerType<any>, string[]>();

	public static readonly clientEvent = <T extends WsController, K extends keyof T>() => (target: T, key: K): ClientEventCheck<T, K> => {
		const ctor = target.constructor as WsControllerType<any>;
		if (!this.clientEventHandlers.has(ctor)) {
			this.clientEventHandlers.set(ctor, []);
		}
		this.clientEventHandlers.get(ctor)!.push(key.toString());
		return void (0) as ClientEventCheck<T, K>;
	}

	public static getClientEventHandlers(controller: WsControllerType<any>) {
		return this.clientEventHandlers.get(controller) || [];
	}

	private static readonly GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

	private static readonly createAcceptValue = (secWebSocketKey: string) => {
		return createHash("sha1")
			.update(secWebSocketKey + WsTransport.GUID, "binary")
			.digest("base64");
	}

	private onConnection?: ConnectionHandler;
	private onClosed?: ClosedHandler;

	private readonly endpoints: Map<string, WsEndpoint<any, any>> = new Map();

	private readonly endpointControllerMap = new Map<WsControllerType<any>, Set<WsEndpoint<any, any>>>();

	public override configure(config: WsTransportConfig): void | Promise<void> {
		this.configureEndpoints(config.endpoints);

		config.server.onUpgrade(this.onUpgrade);

		if (config.onConnection)
			this.onConnection = config.onConnection;

		if (config.onClosed)
			this.onClosed = config.onClosed;
	}

	private configureEndpoints(endpoints: WsEndpoint<any, any> | WsEndpoint<any, any>[]) {
		if (!Array.isArray(endpoints))
			endpoints = [endpoints];

		for (const endpoint of endpoints) {
			this.endpoints.set(endpoint.path, endpoint);
			for (const event in endpoint.eventHandlers) {
				const key = event as keyof typeof endpoint.eventHandlers;
				const handler = endpoint.eventHandlers[key]!;
				if (!this.endpointControllerMap.has(handler.controller)) {
					this.endpointControllerMap.set(handler.controller, new Set());
				}
				this.endpointControllerMap.get(handler.controller)!.add(endpoint);
			}
		}
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

		const id = Connection.nextId();
		const s = new Socket(this.app, id, socket, endpoint);
		const conn = new WsConnection(this.app.connectionRegistry, this, id, s);

		if (!await endpoint.connect(req, id, s, head)) {
			return reject("Not allowed to connect!");
		}

		this.app.connectionRegistry.add(conn);

		socket.on("close", () => {
			this.onClosed && this.onClosed(req, socket);
			this.app.connectionRegistry.remove(id);
			endpoint.disconnect(id);
		});

		socket.on("error", (err) => {
			if ("code" in err && err.code === "ECONNABORTED") {
				// ?
			} else {
				console.log(err);
			}
		});

		socket.write(
			"HTTP/1.1 101 Switching Protocols\r\n" +
			"Upgrade: websocket\r\n" +
			"Connection: Upgrade\r\n" +
			`Sec-WebSocket-Accept: ${WsTransport.createAcceptValue(key)}\r\n` +
			"\r\n"
		);
	}

	override async resolveEvent<K extends keyof DomainEvents>(_event: K, data: DomainEvents[K], binding: EventBinding<ControllerType<WsTransport, IncomingMessage, never>>, connections: ReadonlyArray<Connection<any>>) {
		const endpoints = this.endpointControllerMap.get(binding.controller);
		if (!endpoints)
			return;

		const controller = new binding.controller(this);
		this.app.injectServices(controller);

		const result = await (controller[binding.method] as Function)(data) as ServerEventResponse<any>;
		const eventData = result[SEND]

		endpoints.forEach(e => {
			connections.forEach(c => {
				if (e.hasConnectionId(c.id)) {
					const con = c as WsConnection;
					const eventName = e.resolveEventName(binding.controller, binding.method);
					con.emit(eventName, eventData);
				}
			});
		});
	}
}

const WsControllerClass = WsTransport.Controller();

export class WsController extends WsControllerClass {

}

export type WsControllerCtor = typeof WsController;
//export type WsController = InstanceType<typeof WsController>;
export type WsControllerType<T extends WsController> = new (...args: any[]) => T;


export type WsUpgradeArgs = [req: IncomingMessage, socket: Duplex, head: Buffer<ArrayBuffer>];

export type WsTransportConfig = {
	server: UpgradableTransport<WsUpgradeArgs>;
	endpoints: WsEndpoint<any, any> | WsEndpoint<any, any>[];
	onConnection?: ConnectionHandler;
	onClosed?: ClosedHandler;
};

type ConnectionHandler = (req: IncomingMessage, socket: Duplex) => boolean | Promise<boolean>;
type ClosedHandler = (req: IncomingMessage, socket: Duplex) => void | Promise<void>;


export const clientEvent = WsTransport.clientEvent;

type ClientEventCheck<T extends WsController, K extends keyof T> = T[K] extends (connection: WsConnection<any>, ...args: any[]) => (void | Promise<void>) ? void : "ERROR!?!?";

export const SEND = Symbol();

export type ServerEventResponse<T> = {
	readonly [SEND]: T;
};

export const send = <T>(data: T): ServerEventResponse<T> => ({ [SEND]: data });