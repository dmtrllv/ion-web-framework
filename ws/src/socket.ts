import Stream from "stream";
import { WsTransport } from "./transport.js";
import { BIN_FRAME, CLOSE, parseFrame, PING, TEXT_FRAME } from "./frame.js";
import { ClientEvents } from "./schema.js";

export class Socket {
	public readonly id: number;

	private readonly ws: WsTransport;
	private readonly socket: Stream.Duplex;

	public constructor(id: number, ws: WsTransport, socket: Stream.Duplex) {
		this.id = id;
		this.ws = ws;
		this.socket = socket;

		let opCode: number | null = null;
		let buffers: Buffer[];

		this.socket.on("data", (buffer: Buffer<ArrayBuffer>) => {
			const { fin, op, payload } = parseFrame(buffer);

			if (op !== 0x0) {
				opCode = op;
				buffers = [Buffer.copyBytesFrom(payload)];
			} else {
				buffers.push(Buffer.copyBytesFrom(payload));
			}

			if (fin) {
				if (opCode === null)
					throw new Error("currentOpcode === null");
				this.onData(opCode, Buffer.concat(buffers));
				buffers = [];
				opCode = null;
			}
		});
	}

	private onData(op: number, buffer: Buffer<ArrayBufferLike>) {
		switch (op) {
			case TEXT_FRAME:
				const data = buffer.toString("utf-8");
				try {
					const json = JSON.parse(data);
					if("event" in json) {
						const route = WsTransport.getRoute(json.event as keyof ClientEvents);
						if(!route) {
							console.error(`could not find ws route for event ${json.event}!`);
							return;
						}
						
						const c = new route.controller();
						
						const args = route.args.map(arg => {
							if(arg === Socket) {
								return this;
							}
							return arg;
						});
						(c[route.key as keyof typeof c] as any)(...args);
					}
				} catch {
					console.error("what to do now?");
				}
				break;
			case BIN_FRAME:
				console.error("TODO: handle binary", buffer);
				break;
			case PING:
				const frame = Buffer.alloc(2 + buffer.length);
				frame[0] = 0x8A; // FIN + pong (10001010)
				frame[1] = buffer.length;
				buffer.copy(frame, 2);
				this.socket.write(frame);
				break;
			case CLOSE:
				console.error(`TODO: handle close!`);
				break;
			default:
				console.error(`Unknown opcode ${op}!`);
				break;
		}
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