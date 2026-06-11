import { WsSchema } from "./schema.js";

export class Socket<_T extends WsSchema = any> {
	public readonly id: number;

	public constructor(id: number) {
		this.id = id;
	}
}