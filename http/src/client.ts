import { ApiRoutes, ApiSchema } from "./api.js";
import { HttpController, HttpControllerCtor, HttpMethod } from "./transport.js";

const isApiMeta = (obj: object): obj is ApiMeta => {
	const keys = Object.keys(obj);
	if (keys.length !== 3)
		return false;
	return "args" in obj && "method" in obj && "path" in obj;
};

export const clientApi = async <T extends ApiSchema<any, any>>(path: ApiSchemaPath<T>): Promise<ClientApi<T>> => {
	const json = await fetch(path).then(r => r.json());

	const walk = (schema: ApiMetaSchema) => {
		const obj: any = {};
		for (const k in schema) {
			const val = schema[k]!;
			if (isApiMeta(val)) {
				obj[k] = createApiHandler(val);
			} else {
				obj[k] = walk(val);
			}
		}
		return obj;
	};

	return walk(json);
};

const createApiHandler = (val: ApiMeta): any => {
	const parsePath = (...args: any[]) => {
		let parts = val.path.split("/");

		val.args.forEach((arg, i) => {
			if (typeof arg === "object" && "param" in arg) {
				const index = parts.indexOf(arg.param);
				if (index > -1) {
					parts[index] = args[i];
				}
			}
		});
		return parts.join("/");
	};

	const parseBody = (...args: any[]) => {
		console.log(val.args, args);
		const index = val.args.indexOf("body");
		if (index > -1) {
			return JSON.stringify(args[index]);
		}
		return null;
	};

	const parseQuery = (...args: any[]) => {
		const index = val.args.indexOf("query");
		if (index > -1) {
			return new URLSearchParams(args[index]).toString();
		}
		return undefined;
	};

	return async (...args: any[]) => {
		const path = parsePath(...args);
		const body = parseBody(...args);
		const query = parseQuery(...args);
		const headers: HeadersInit = {};

		if (body !== null) {
			headers["Content-Type"] = "application/json";
			headers["Content-Length"] = body.length.toString();
		}

		try {
			const str = await fetch(path + (query ? `?${query}` : ""), {
				method: val.method.toUpperCase(),
				headers,
				body
			}).then(res => res.text());
			try {
				return JSON.parse(str);
			} catch {
				return {
					data: str
				}
			}
		} catch (e) {
			return {
				error: e,
			}
		}
	};
}


type ApiSchemaPath<T extends ApiSchema<any, any>> = T extends ApiSchema<infer Path, any> ? Path : never;

type ClientApi<T extends ApiSchema<any, any>> = T extends ApiSchema<any, infer Routes> ? ClientApiRoutes<Routes> : never;

type ClientApiRoutes<T extends ApiRoutes> = {
	readonly [K in keyof T]:
	T[K] extends HttpControllerCtor ? ClientController<InstanceType<T[K]>> :
	T[K] extends ApiRoutes ? ClientApiRoutes<T[K]> : never
};

type ClientController<T extends HttpController> = {
	[K in HttpControllerApiMethods<T>]: ClientHandler<T[K]>;
};

type ClientHandler<T> = T extends (...args: infer Args) => infer R ? (...args: Args) => ApiResult<R> : never;

export type ApiResult<T> = {
	data: T;
	error: never;
} | {
	data: never;
	error: Error | string;
}

type HttpControllerApiMethods<T extends HttpController> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type ApiMeta = { path: string, method: HttpMethod, args: any[] };

type ApiMetaSchema = {
	readonly [key: string]: ApiMeta | ApiMetaSchema;
};
