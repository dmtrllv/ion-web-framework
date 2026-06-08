import { createReadStream, statSync } from "node:fs";
import { OutgoingMessage } from "node:http";
import nodePath from "node:path";
import { getMimeType } from "./mime-type.js";

export abstract class Response<T> {
	protected readonly data: T;

	public constructor(data: T) {
		this.data = data;
	}

	public abstract write(res: OutgoingMessage): void | Promise<void>;
}

export class HtmlResponse extends Response<string> {
	public override write(res: OutgoingMessage): void | Promise<void> {
		res.write(this.data);
	}
}

export class JsonResponse<T> extends Response<T> {
	public override write(res: OutgoingMessage): void | Promise<void> {
		const json = JSON.stringify(this.data);
		res.setHeader("Content-Type", "application/json");
		res.setHeader("Content-Length", json.length);
		res.write(json);
	}
}

export class FileResponse extends Response<string> {
	public override write(res: OutgoingMessage): Promise<void> {
		return new Promise((resolve, reject) => {
			const path = nodePath.resolve(this.data);
			const stat = statSync(path);
			res.setHeader("Content-Type", getMimeType(path));
			res.setHeader("Content-Length", stat.size);
			const stream = createReadStream(path);
			stream.pipe(res);
			stream.on("error", (e) => {
				reject(e);
			});
			stream.on("end", () => {
				resolve();
			});
		});
	}
}

export const html = (html: string) => new HtmlResponse(html);
export const json = (obj: any) => new JsonResponse(obj);
export const file = (path: string) => new FileResponse(path);