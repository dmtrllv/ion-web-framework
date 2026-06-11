//import { Transport, UpgradableTransport } from "@ion/core";
//import { createHash } from "node:crypto";
//import { IncomingMessage } from "node:http";
//import Stream from "node:stream";
//import { Socket } from "./socket.js";
//import { WsSchema } from "./schema.js";

//type UpgradeArgs = [req: IncomingMessage, socket: Stream.Duplex, head: Buffer<ArrayBuffer>];

//export type WsConfig = {
//	server: UpgradableTransport<UpgradeArgs>;
//	schemas: WsSchema<any, any>[];
//	onConnection?: (req: IncomingMessage, socket: Stream.Duplex) => boolean | Promise<boolean>;
//	onClosed?: (req: IncomingMessage, socket: Socket<any>) => void | Promise<void>;
//};

////type WsRoute = {
////	controller: WsControllerCtor;
////	args: any[];
////	key: string;
////	event: keyof ClientEvents;
////}

//export class WsTransport extends Transport<any, any> {
//	private static readonly GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
	
//	private static readonly createAcceptValue = (secWebSocketKey: string) => {
//		return createHash("sha1")
//			.update(secWebSocketKey + WsTransport.GUID, "binary")
//			.digest("base64");
//	}

//	private onConnection: ((req: IncomingMessage, socket: Stream.Duplex) => boolean | Promise<boolean>) | undefined;
//	private onClosed: ((req: IncomingMessage, socket: Socket<any>) => void | Promise<void>) | undefined;

//	override configure({ server, schemas, onConnection, onClosed }: WsConfig): void | Promise<void> {
//		server.onUpgrade(this.onUpgrade);
//		this.onConnection = onConnection;
//		this.onClosed = onClosed;
//		console.log(schemas);
//	}

//	private readonly onUpgrade = async (req: IncomingMessage, socket: Stream.Duplex, _head: Buffer<ArrayBuffer>) => {
//		//const reject = (reason: string) => {
//		//	console.error(reason);
//		//	socket.destroy();
//		//}

//		//if (req.headers.upgrade !== "websocket") {
//		//	return reject("Not a websocket!");
//		//}

//		//const version = req.headers["sec-websocket-version"];
//		//if (version !== "13") {
//		//	return reject(`Wrong got version ${version} but expected version 13!`);
//		//}

//		//const key = req.headers["sec-websocket-key"];

//		//if (!key) {
//		//	return reject("Missing header \"sec-websocket-key\"!");
//		//}

//		//if (this.onConnection) {
//		//	if (!await this.onConnection(req, socket)) {
//		//		return reject("Not allowed to connect!");
//		//	}
//		//}

//		//const acceptKey = this.createAcceptValue(key);

//		//socket.write(
//		//	"HTTP/1.1 101 Switching Protocols\r\n" +
//		//	"Upgrade: websocket\r\n" +
//		//	"Connection: Upgrade\r\n" +
//		//	`Sec-WebSocket-Accept: ${acceptKey}\r\n` +
//		//	"\r\n"
//		//);

//		//const s = new Socket(this.idCounter++, this, socket);

//		//this.sockets.add(s);

//		//socket.on("end", async () => {
//		//	if (this.onClosed) {
//		//		await this.onClosed(req, s);
//		//	}
//		//	this.sockets.delete(s);
//		//});
//	}

//	public static readonly encodeStringFrame = (str: string): Buffer<ArrayBuffer> => {
//		const payload = Buffer.from(str);
//		const len = payload.length;

//		let header;

//		if (len < 126) {
//			header = Buffer.alloc(2);
//			header[0] = 0x81;

//			header[1] = len;
//		} else if (len < 65536) {
//			header = Buffer.alloc(4);
//			header[0] = 0x81;
//			header[1] = 126;
//			header.writeUInt16BE(len, 2);
//		} else {
//			header = Buffer.alloc(10);
//			header[0] = 0x81;
//			header[1] = 127;
//			header.writeBigUInt64BE(BigInt(len), 2);
//		}

//		return Buffer.concat([header, payload]);
//	}

//	//public readonly emit = (buffer: Buffer<ArrayBuffer>) => {
//	//	this.sockets.forEach(s => s.write(buffer));
//	//}

//	//public readonly broadcast = (socket: Socket, buffer: Buffer<ArrayBuffer>) => {
//	//	this.sockets.forEach(s => s !== socket && s.write(buffer));
//	//}

//	//public readonly getSocket = (id: number) => {
//	//	return this.sockets.values().find(s => s.id === id) || null;
//	//}
//}


//export const WsController = WsTransport.Controller({
//	without<T extends WsController, K extends (keyof T)[]>(this: new (...args: any[]) => T, ..._keys: K): new (...args: any[]) => Omit<T, K[number]> {
//		return this;
//	}
//});

//export type WsControllerCtor = typeof WsController;
//export type WsController = InstanceType<typeof WsController>;

//export const serverEvent = <Data>(...args: [event: string, handler: (...args: any[]) => void | Promise<void>]): ServerEvent<(typeof args)[0], Data> => {
//	return Object.assign(args[1], {
//		event: args[0]
//	}) as ServerEvent<(typeof args)[0], Data>;
//};

//export type ServerEvent<T extends string, Data> = ServerEventEmitter<Data> & {
//	readonly event: T;
//};

//export const SERVER_EVENT_TAG = Symbol(); 

//export type ServerEventEmitter<T> = ((...args: any[]) => void | Promise<void>) & {
//	readonly [SERVER_EVENT_TAG]: T;
//};

////export const ws = <K extends keyof ClientEvents, T extends WsController, Key extends keyof T>(event: K) => (target: T, key: Key): MatchMethod<K, T, Key> => {
////	const args = Reflect.getMetadata("design:paramtypes", target, key as any);
////	WsTransport.registerRoute(event, target.constructor as any, key as any, args);
////	return void (0) as any;
////}

////export type MatchMethod<K extends keyof ClientEvents, T extends WsController, Key extends keyof T> =
////	[void] extends [ClientEvents[K]] ? void :
////	T[Key] extends (...args: infer Args) => any ? [Args[0]] extends [ClientEvents[K]] ? void : "Invalid arguments!" : "Invalid arguments!";