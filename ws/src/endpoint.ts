import { WsSchema } from "./schema.js";

export class WsEndpoint<Path extends string, T extends WsSchema> {
	public readonly path: Path;
	public readonly schema: T;
	
	public constructor(path: Path, schema: T) {
		this.path = path;
		this.schema = schema;
	}
}