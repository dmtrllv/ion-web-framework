import { Transport, UpgradableTransport } from "@ion/core";
import { createHash } from "node:crypto";
import { IncomingMessage } from "node:http";
import Stream from "node:stream";

type UpgradeArgs = [req: IncomingMessage, socket: Stream.Duplex, head: Buffer<ArrayBuffer>];

export type WsConfig = {
	server: UpgradableTransport<UpgradeArgs>;
};

export class WsTransport extends Transport<any, any> {
	private static readonly GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

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
		console.log("Upgrade request received");

		const reject = (reason: string) => {
			console.log(reason);
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

		socket.on("data", (buf) => {
			console.log("WS frame data:", buf);
		});

		const s = new Socket(this.idCounter++, this, socket);

		this.sockets.add(s);

		s.broadcast(`client ${s.id} connected!`);

		socket.on("end", () => {
			s.broadcast(`client ${s.id} disconnected!`);
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

export class Socket {
	public readonly id: number;
	
	private readonly ws: WsTransport;
	private readonly socket: Stream.Duplex;

	public constructor(id: number, ws: WsTransport, socket: Stream.Duplex) {
		this.id = id;
		this.ws = ws;
		this.socket = socket;
	}

	public readonly write = (buffer: Buffer<ArrayBuffer>) => this.socket.write(buffer);

	public readonly send = (value: any) => {
		const val = typeof value === "string" ? value : JSON.stringify(value);
		this.socket.write(WsTransport.encodeStringFrame(val));
	}

	public readonly emit = (value: any) => {
		const val = typeof value === "string" ? value : JSON.stringify(value);
		this.ws.emit(WsTransport.encodeStringFrame(val));
	}

	public readonly broadcast = (value: any) => {
		const val = typeof value === "string" ? value : JSON.stringify(value);
		this.ws.broadcast(this, WsTransport.encodeStringFrame(val));
	}
}



export const WsController = WsTransport.Controller();

export type WsControllerCtor = typeof WsController;
export type WsController = InstanceType<typeof WsController>;
