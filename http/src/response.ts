import { OutgoingMessage } from "node:http";

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

export const html = (html: string) => new HtmlResponse(html);
export const json = (obj: any) => new JsonResponse(obj);