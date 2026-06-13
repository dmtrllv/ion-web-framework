import { Duplex } from "node:stream";
import { WsSchema } from "./schema.js";
import { BIN_FRAME, CLOSE, encodeStringFrame, parseFrame, PING, TEXT_FRAME } from "./frame.js";
import { WsEndpoint } from "./endpoint.js";
import { App } from "@ion/core";
import { WsContext, WsContextType } from "./context.js";

export class Socket<T extends WsSchema = any> {
	public readonly id: number;

	private readonly app: App;
	private readonly socket: Duplex;
	private readonly endpoint: WsEndpoint<any, T>;
	private readonly contexts = new Map<WsContextType<any>, WsContext>();

	public constructor(app: App, id: number, socket: Duplex, endpoint: WsEndpoint<any, T>) {
		this.app = app;
		this.id = id;
		this.socket = socket;
		this.endpoint = endpoint;

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
					if ("event" in json) {
						const handler = this.endpoint.resolveClientEventHandler(json.event);

						if (!handler) {
							console.error("unknown event", json.event);
							break;
						}

						const c = new handler.controller();
						this.app.injectServices(c);
						(c[handler.key as keyof typeof c] as any)(this.app.connectionRegistry.get(this.id), json.data || undefined);
					}
				} catch (e) {
					console.error(e);
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

	public readonly send = (buffer: Buffer<ArrayBuffer>) => {
		if (!this.socket.closed)
			this.socket.write(buffer)
		
	}

	public sendJson(value: any) {
		return this.send(encodeStringFrame(JSON.stringify(value)));
	}

	public emitEvent<E extends string>(event: E, ...[data]: [T[E]]) {
		return this.sendJson({ event, data });
	}

	public use<T extends WsContext>(type: WsContextType<T>): T {
		if(!this.contexts.has(type)) {
			this.contexts.set(type, new type());
		}
		return this.contexts.get(type)! as T;
	}
}