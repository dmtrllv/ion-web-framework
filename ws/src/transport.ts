import { Transport, UpgradableTransport } from "@ion/core";
import { createHash } from "node:crypto";
import { IncomingMessage } from "node:http";
import Stream from "node:stream";
import { Socket } from "./socket.js";
import { ClientEvents, WsSchema } from "./schema.js";

type UpgradeArgs = [req: IncomingMessage, socket: Stream.Duplex, head: Buffer<ArrayBuffer>];

export type WsConfig = {
	server: UpgradableTransport<UpgradeArgs>;
	schema: WsSchema;
};

type WsRoute = {
	controller: WsControllerCtor;
	args: any[];
	key: string;
	event: keyof ClientEvents;
}

export class WsTransport extends Transport<any, any> {
	private static readonly GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

	private static readonly routes = new Map<keyof ClientEvents, WsRoute>();

	public static readonly registerRoute = <K extends keyof ClientEvents>(event: K, controller: WsControllerCtor, key: string, args: any[]) => {
		if (this.routes.has(event))
			throw new Error(`Duplicate web socket route for ${event}!`);
		WsTransport.routes.set(event, {
			controller,
			key,
			args,
			event
		});
	}

	public static readonly getRoute = <K extends keyof ClientEvents>(event: K) => {
		return WsTransport.routes.get(event) || null;
	}

	private readonly sockets: Set<Socket> = new Set();

	private idCounter = 0;

	override configure({ server }: WsConfig): void | Promise<void> {
		server.onUpgrade(this.onUpgrade);
	}

	private readonly createAcceptValue = (secWebSocketKey: string) => {
		return createHash("sha1")
			.update(secWebSocketKey + WsTransport.GUID, "binary")
			.digest("base64");
	}

	private readonly onUpgrade = (req: IncomingMessage, socket: Stream.Duplex, _head: Buffer<ArrayBuffer>) => {
		const reject = (reason: string) => {
			console.error(reason);
			socket.destroy();
		}

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

		const acceptKey = this.createAcceptValue(key);

		socket.write(
			"HTTP/1.1 101 Switching Protocols\r\n" +
			"Upgrade: websocket\r\n" +
			"Connection: Upgrade\r\n" +
			`Sec-WebSocket-Accept: ${acceptKey}\r\n` +
			"\r\n"
		);

		const s = new Socket(this.idCounter++, this, socket);

		this.sockets.add(s);

		socket.on("end", () => {
			this.sockets.delete(s);
		});
	}

	public static readonly encodeStringFrame = (str: string): Buffer<ArrayBuffer> => {
		const payload = Buffer.from(str);
		const len = payload.length;

		let header;

		if (len < 126) {
			header = Buffer.alloc(2);
			header[0] = 0x81;

			header[1] = len;
		} else if (len < 65536) {
			header = Buffer.alloc(4);
			header[0] = 0x81;
			header[1] = 126;
			header.writeUInt16BE(len, 2);
		} else {
			header = Buffer.alloc(10);
			header[0] = 0x81;
			header[1] = 127;
			header.writeBigUInt64BE(BigInt(len), 2);
		}

		return Buffer.concat([header, payload]);
	}

	public readonly emit = (buffer: Buffer<ArrayBuffer>) => {
		this.sockets.forEach(s => s.write(buffer));
	}

	public readonly broadcast = (socket: Socket, buffer: Buffer<ArrayBuffer>) => {
		this.sockets.forEach(s => s !== socket && s.write(buffer));
	}
}


export const WsController = WsTransport.Controller();

export type WsControllerCtor = typeof WsController;
export type WsController = InstanceType<typeof WsController>;

export const ws = <K extends keyof ClientEvents, T extends WsController, Key extends keyof T>(event: K) => (target: T, key: Key): MatchMethod<K, T, Key> => {
	const args = Reflect.getMetadata("design:paramtypes", target, key as any);
	WsTransport.registerRoute(event, target.constructor as any, key as any, args);
	return void (0) as any;
}

export type MatchMethod<K extends keyof ClientEvents, T extends WsController, Key extends keyof T> =
	[void] extends [ClientEvents[K]] ? void :
	T[Key] extends (...args: infer Args) => any ? [Args[0]] extends [ClientEvents[K]] ? void : "Invalid arguments!" : "Invalid arguments!";