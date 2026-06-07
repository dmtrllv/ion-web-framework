import { RegisteredExtractor, Transport } from "@ion/core";
import { createServer, IncomingMessage, OutgoingMessage, Server, ServerResponse } from "node:http";
import { ApiSchema } from "./api.js";
import { Router } from "./router.js";
import { json, Response } from "./response.js";
import { posix } from "node:path";

export type HttpConfig = {
	port?: string | number;
	host?: string;
	api?: ApiSchema<any, any> | undefined;
}

type HttpHandlerKeys<T extends HttpController> = {
	[K in keyof T]: T[K] extends HttpHandler ? K : never;
}[keyof T];

type HttpHandler = (...args: any[]) => any;

export type RouteMeta<T extends HttpController, K extends HttpHandlerKeys<T>> = {
	readonly controller: HttpControllerCtor;
	readonly key: K,
	readonly extractors: RegisteredExtractor<any, any>[];
	readonly path: string;
}

export type HttpMethod =
	| "get"
	| "post"
	| "put"
	| "delete";

export class HttpTransport extends Transport<IncomingMessage, OutgoingMessage> {
	private static readonly handlers: Record<HttpMethod, Map<string, RouteMeta<any, any>>> = {
		get: new Map(),
		post: new Map(),
		put: new Map(),
		delete: new Map(),
	};

	private static readonly pathMap = new Map<HttpControllerCtor, Record<string | symbol, { path: string, method: HttpMethod }>>();

	private static readonly basePaths = new Map<HttpControllerCtor, string>();

	private static readonly setPath = <T extends HttpController>(controller: T, key: string | symbol | number, path: string, method: HttpMethod) => {
		const ctor = controller.constructor as any;
		if (!HttpTransport.pathMap.has(ctor))
			HttpTransport.pathMap.set(ctor, {});
		HttpTransport.pathMap.get(ctor)![key] = { method, path };
		HttpTransport.handlers.get.set(path, { controller: ctor, key, extractors: this.getExtractors(controller as any, key as any), path });
	}

	public static readonly get = <T extends HttpController, K extends HttpHandlerKeys<T>>(path: string) => (controller: T, key: K) => {
		HttpTransport.setPath(controller, key, path, "get");
	}

	public static readonly post = <T extends HttpController, K extends HttpHandlerKeys<T>>(path: string) => (controller: T, key: K) => {
		HttpTransport.setPath(controller, key, path, "post");
	}

	public static readonly put = <T extends HttpController, K extends HttpHandlerKeys<T>>(path: string) => (controller: T, key: K) => {
		HttpTransport.setPath(controller, key, path, "put");
	}

	public static readonly delete = <T extends HttpController, K extends HttpHandlerKeys<T>>(path: string) => (controller: T, key: K) => {
		HttpTransport.setPath(controller, key, path, "delete");
	}

	public static readonly setBasePath = <T extends HttpControllerCtor>(path: string) => (target: T) => {
		HttpTransport.basePaths.set(target, path);
	}

	public static readonly getBasePath = <T extends HttpControllerCtor>(target: T): string => {
		return HttpTransport.basePaths.get(target) || "/";
	}

	private readonly server: Server<typeof IncomingMessage, typeof ServerResponse>;

	private readonly router = new Router();

	private readonly config: Required<HttpConfig> = {
		host: "127.0.0.1",
		port: 3001,
		api: undefined
	};

	private port: string | number = 3001;
	private host: string = "127.0.0.1";

	constructor() {
		super();
		this.server = createServer(this.onRequest.bind(this));
	}

	public resolvePath(controller: HttpControllerCtor, key: string | symbol): string | undefined {
		const base = HttpTransport.getBasePath(controller);
		const p = HttpTransport.pathMap.get(controller)?.[key]?.path;
		if (!p)
			return undefined;
		return posix.join(base, p);
	}

	private async onRequest(req: IncomingMessage, res: ServerResponse) {
		const { method, url } = req;
		if (!url || !method)
			return res.end();

		const handler = this.router.resolve(method.toLowerCase() as HttpMethod, url);

		if (handler === null) {
			res.statusCode = 404;
			return res.end();
		}

		const controller = new handler.controller();
		const fn = controller[handler.key as keyof typeof controller] as Function;
		try {
			const args = handler.extractors.map(e => {
				if (e === undefined) {
					return e;
				}
				const ctx = {
					transport: this,
					input: req,
					controller: controller.constructor as any,
					key: handler.key,
					paramType: e.paramType
				};
				return e.extractor(ctx, ...e.args);
			});
			const response = await fn(...args);
			if (response === undefined) {
				return res.end();
			}

			if (response instanceof Response) {
				await response.write(res);
			} else if (typeof response === "string") {
				res.write(response);
			} else {
				await json(response).write(res);
			}
		} catch (e) {
			console.log({ error: e });
		}

		return res.end();
	}

	override configure(config: HttpConfig = {}): void | Promise<void> {
		Object.assign(this.config, config);

		for (const method in HttpTransport.handlers) {
			const m = method as HttpMethod;
			const handlers = HttpTransport.handlers[m]!;
			for (const [p, r] of handlers) {
				this.router.register(m, p, r);
			}
		}
	}

	override start(): void | Promise<void> {
		this.server.listen(Number(this.port), this.host, () => {
			console.log("Server listening on http://" + this.host + ":" + this.port.toString());
		});
	}

	override stop(): void | Promise<void> {
		throw new Error("Method not implemented.");
	}
}

export const HttpController = HttpTransport.Controller();

export type HttpControllerCtor = typeof HttpController;
export type HttpController = InstanceType<typeof HttpController>;

export const get = HttpTransport.get;
export const post = HttpTransport.post;
export const put = HttpTransport.put;
export const del = HttpTransport.delete;

export const route = HttpTransport.setBasePath;

export const body = HttpTransport.createExtractor(({ input }) => new Promise((res) => {
	// todo validate type
	let str: string = "";
	input.on("data", buffer => {
		str += buffer.toString();
	});
	input.on("end", () => {
		try {
			let json = JSON.parse(str);
			res(json);
		} catch {
			res(str);
		}
	});
}));

export const param = HttpTransport.createExtractor(({ controller, transport, key, input }, pathParam: string) => {
	const path = transport.resolvePath(controller, key);
	if (!path)
		throw new Error(`Could not get path from  controller handler ${controller.name}.${key.toString()}!`);
	const parts = path.split("/").filter(s => !!s);
	const index = parts.indexOf(pathParam);
	if (index < 0)
		throw new Error(`Parameter ${pathParam} does not matches a part of ${path}!`);
	const param = input.url!.split("/").filter(s => !!s)[index];
	if (param === undefined)
		throw new Error(`Url does not matches param or path!`);
	return param;
});
