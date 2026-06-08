import { RegisteredExtractor, Transport, UpgradableTransport, UpgradeHandler } from "@ion/core";
import { createServer, IncomingMessage, OutgoingMessage, Server, ServerResponse } from "node:http";
import { ApiRoutes, ApiSchema } from "./api.js";
import { Router } from "./router.js";
import { file, json, Response } from "./response.js";
import { posix, resolve } from "node:path";
import { existsSync } from "node:fs";
import { parse } from "node:querystring";

export type PublicPath = {
	path: string;
	prefix: string;
}

export type HttpConfig = {
	port?: string | number;
	host?: string;
	api?: ApiSchema<any, any> | undefined;
	public?: {
		path: string | PublicPath | (string | PublicPath)[];
		resolveHtml?: boolean;
	};
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

export class HttpTransport extends Transport<IncomingMessage, OutgoingMessage> implements UpgradableTransport<[IncomingMessage]> {
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
		HttpTransport.handlers[method].set(path, { controller: ctor, key, extractors: this.getExtractors(controller as any, key as any), path });
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

	private readonly onUpgradeHandlers: UpgradeHandler<[IncomingMessage]>[] = [];

	private readonly config: Required<HttpConfig> = {
		host: "127.0.0.1",
		port: 3001,
		api: undefined,
		public: {
			path: []
		}
	};

	private port: string | number = 3001;
	private host: string = "127.0.0.1";

	constructor() {
		super();
		this.server = createServer(this.onRequest.bind(this));
	}

	public onUpgrade(handler: UpgradeHandler<[IncomingMessage]>): void {
		this.onUpgradeHandlers.push(handler);
	}

	public resolvePath(controller: HttpControllerCtor, key: string | symbol): string | undefined {
		const base = HttpTransport.getBasePath(controller);
		const p = HttpTransport.pathMap.get(controller)?.[key]?.path;
		if (!p)
			return undefined;
		return posix.join(base, p);
	}

	public resolveMethod(controller: HttpControllerCtor, key: string | symbol): HttpMethod | undefined {
		return HttpTransport.pathMap.get(controller)?.[key]?.method;
	}

	private async onRequest(req: IncomingMessage, res: ServerResponse) {
		const { method } = req;
		if (!req.url || !method)
			return res.end();

		const [url] = req.url.split("?") as [string];
	
		const handler = this.router.resolve(method.toLowerCase() as HttpMethod, url);

		if (handler === null) {
			return this.resolvePublicPath(url, res);
		}

		const controller = new handler.controller();
		const fn = (controller[handler.key as keyof typeof controller]as Function).bind(controller);
		try {
			const args = await Promise.all(handler.extractors.map(e => {
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
				//console.log(e.extractor === param.extractor);
				return e.extractor(ctx, ...e.args);
			}));
			const response = await fn(...args);
			if (response === undefined) {
				return res.end();
			}

			if (response instanceof Response) {
				await response.write(res);
			} else if (typeof response === "string") {
				res.write(response);
			} else {
				await json({ data: response }).write(res);
			}
		} catch (e) {
			console.error(e);
			await json({ error: e }).write(res);
		}

		return res.end();
	}

	private findPublicFile(paths: (string | PublicPath)[], path: string) {
		for (const p of paths) {
			if (typeof p === "string") {
				const filePath = resolve(p, path);
				if (existsSync(filePath))
					return filePath;
			} else {
				const prefix = p.prefix.startsWith("/") ? p.prefix.substring(1) : p.prefix;
				if (path.startsWith(prefix)) {
					const filePath = resolve(p.path, path.substring(p.prefix.length));
					if (existsSync(filePath))
						return filePath
				}
			}
		}
		return undefined;
	}


	private async resolvePublicPath(url: string, res: ServerResponse<IncomingMessage>) {
		const paths = Array.isArray(this.config.public.path) ? this.config.public.path : [this.config.public.path];

		if (this.config.public.resolveHtml && url === "/") {
			const filePath = this.findPublicFile(paths, "index.html");
			if (filePath) {
				await file(filePath).write(res);
				return res.end();
			}
		}

		const filePath = this.findPublicFile(paths, url.substring(1));

		if (filePath) {
			await file(filePath).write(res);
			return res.end();
		} else {
			if (this.config.public.resolveHtml) {
				const filePath = this.findPublicFile(paths, url.substring(1) + ".html");
				if (filePath) {
					await file(filePath).write(res);
					return res.end();
				}
			}
		}

		res.statusCode = 404;
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

		if (this.config.api) {
			this.configureApi(this.config.api);
		}
	}

	private configureApi(api: ApiSchema<any, any>) {
		// TODO: cleanup
		const walk = (target: ApiRoutes) => {
			const json: any = {};
			for (const k in target) {
				const v = target[k]!;
				if (typeof v === "function") {

					const x = HttpTransport.pathMap.get(v);
					if (!x)
						continue;

					json[k] = {};

					for (const key in x) {
						const { method } = x[key]!;
						const p = this.resolvePath(v, key)!;
						if (!p)
							continue;
						const y = this.router.resolve(method, p);
						if (y)
							json[k][key] = {
								path: p,
								method,
								args: y.extractors.map(e => {
									if (e.extractor === body.extractor) {
										return "body";
									} else if (e.extractor === param.extractor) {
										return { param: e.args[0] };
									} else if(e.extractor === query.extractor) {
										return "query";
									} else {
										return null;
									}
								})
							};
					}
				} else {
					json[k] = walk(v);
				}
			}
			return json;
		};

		const apiSchema = walk(api.routes);

		this.router.register("get", api.path, {
			controller: class extends HttpController {
				get() {
					return json(apiSchema);
				}
			},
			extractors: [],
			key: "get",
			path: api.path
		});

		console.log(JSON.stringify(apiSchema, null, 4));
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

export const query = HttpTransport.createExtractor(({ input }) => {
	const str = input.url!.split("?")[1];

	if (str === undefined)
		return {};
	
	return parse(str);
});
