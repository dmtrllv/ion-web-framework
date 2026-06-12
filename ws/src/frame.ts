export class FrameBuilder {

}

export type PayloadSize = number;

export const parseFrame = (frame: Buffer<ArrayBuffer>): Frame => {
	const b1 = frame.readUInt8(0);
	const b2 = frame.readUInt8(1);

	const fin = (b1 & 0x80) !== 0;
	const op = b1 & 0x0f;

	const masked = (b2 & 0x80) !== 0;
	const len7 = b2 & 0x7f;

	let offset = 2;

	let length = len7;

	if (len7 === 126) {
		length = frame.readUInt16BE(offset);
		offset += 2;
	} else if (len7 === 127) {
		length = Number(frame.readBigUInt64BE(offset));
		offset += 8;
	}

	let maskKey: Buffer | null = null;

	if (masked) {
		maskKey = frame.subarray(offset, offset + 4);
		offset += 4;
	}

	let payload = frame.subarray(offset, offset + length);

	if (masked && maskKey) {
		for (let i = 0; i < payload.length; i++) {
			payload[i]! ^= maskKey[i % 4]!;
		}
	}

	return { fin, op: createOp(op), payload };
};

export const encodeStringFrame = (str: string) => {
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
};

export type Frame = {
	readonly fin: boolean;
	readonly op: Op<number>;
	readonly payload: Buffer<ArrayBuffer>;
}

export type Op<T extends number> = T & { __type: "op" };

const createOp = <T extends number>(val: T): Op<T> => val as Op<T>;

export const CONTINUATION_FRAME = createOp(0x0);
export const TEXT_FRAME = createOp(0x1);
export const BIN_FRAME = createOp(0x2);
export const CLOSE = createOp(0x8);
export const PING = createOp(0x9);
export const PONG = createOp(0xA);

export type OpType =
	| typeof CONTINUATION_FRAME
	| typeof TEXT_FRAME
	| typeof BIN_FRAME
	| typeof CLOSE
	| typeof PING
	| typeof PONG;