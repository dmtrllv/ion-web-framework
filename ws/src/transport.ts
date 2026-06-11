import { Transport, UpgradableTransport } from "@ion/core";
import { IncomingMessage } from "node:http";
import { Duplex } from "node:stream";
import { Socket } from "./socket.js";
import { WsEndpoint } from "./endpoint.js";

export class WsTransport extends Transport<IncomingMessage, never> {
	//@ts-ignore
	private onConnection?: ConnectionHandler;
	//@ts-ignore
	private onClosed?: ClosedHandler;

	public override configure(_config: WsTransportConfig): void | Promise<void> {
		console.log(_config.endpoints);
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


export const serverEvent = <T extends WsController, K extends keyof T>() => (_target: T, _key: K): ServerEventCheck<T, K> => {
	// todo
	return void (0) as ServerEventCheck<T, K>;
}

export const clientEvent = <T extends WsController, K extends keyof T>() => (_target: T, _key: K): ClientEventCheck<T, K> => {
	// todo
	return void (0) as ClientEventCheck<T, K>;
}

type ServerEventCheck<T extends WsController, K extends keyof T> = T[K] extends (...args: any[]) => ServerEventResponse<any> ? void : "ERROR!?!?";

type ClientEventCheck<T extends WsController, K extends keyof T> = T[K] extends (socket: Socket, ...args: any[]) => (void | Promise<void>) ? void : "ERROR!?!?";

export type ServerEventResponse<T> = Emit<T> | Broadcast<T> | Send<T> | Promise<Emit<T> | Broadcast<T> | Send<T>>;

export type Emit<T> = {
	data: T;
};

export type Broadcast<T> = {
	source: Socket;
	data: T;
};

export type Send<T> = {
	target: Socket;
	data: T;
};

export const emit = <T>(data: T): Emit<T> => ({ data });
export const broadcast = <T>(source: Socket, data: T): Broadcast<T> => ({ source, data });
export const send = <T>(target: Socket, data: T): Send<T> => ({ target, data });
