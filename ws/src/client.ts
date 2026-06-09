import { ServerSchema } from "./schema.js";

export const client = <T extends ServerSchema<any, any>>(path: ServerSchemaPath<T>, host: string = window.location.host): Promise<WsClient<T>> => new Promise(res => {
	const ws = new WebSocket(`ws://${host}${path}`);

	//const handlers: Partial<Record<keyof T, any[]>> = {};

	ws.onopen = () => {
		res({
			//on(k, callback) {
				//const key = k as any;
				//if (!handlers[key])
				//	handlers[key] = [] as any;
				//handlers[key]!.push(callback);
			//},
		});
	};

	//ws.onmessage = (event) => {
	//	try {
	//		const json = JSON.parse(event.data);
	//		if ("event" in json) {
	//			const e = json.event as string;
	//			const h = ((handlers as any)[e] || []) as any[];
	//			h.forEach(handler => {
	//				handler(json.data);
	//			});
	//		}
	//	}
	//	catch (e) {
	//		console.error(e);
	//	}
	//};

	//ws.onerror = (err) => {
	//	console.error("ws error", err);
	//};
});

type ServerSchemaPath<T extends ServerSchema<any, any>> = T extends ServerSchema<infer Path, any> ? ConcretePath<Path> : never;

type ConcretePath<T extends string> =
	T extends `${infer Head}/:${string}/${infer Tail}`
	? `${Head}/${string}/${ConcretePath<Tail>}`
	: T extends `${infer Head}/:${string}`
	? `${Head}/${string}`
	: T;

export type WsClient<_T extends ServerSchema<any, any>> = {
	//on<K extends keyof T>(event: T, callback: (...args: [data: T[K]]) => void): void;
}