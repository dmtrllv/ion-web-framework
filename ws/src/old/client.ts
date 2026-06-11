//import { WsRoutes, WsSchema } from "./schema.js";
//import { Socket } from "./socket.js";
//import { WsController, WsControllerCtor } from "./transport.js";

//export const client = <T extends WsSchema<any, any>>(path: ServerSchemaPath<T>, host: string = window.location.host): Promise<WsClient<T>> => new Promise(res => {
//	const ws = new WebSocket(`ws://${host}${path}`);

//	//const handlers: Partial<Record<keyof T, any[]>> = {};

//	ws.onopen = () => {
//		res({
//			//on(k, callback) {
//			//const key = k as any;
//			//if (!handlers[key])
//			//	handlers[key] = [] as any;
//			//handlers[key]!.push(callback);
//			//},
//		} as any);
//	};

//	//ws.onmessage = (event) => {
//	//	try {
//	//		const json = JSON.parse(event.data);
//	//		if ("event" in json) {
//	//			const e = json.event as string;
//	//			const h = ((handlers as any)[e] || []) as any[];
//	//			h.forEach(handler => {
//	//				handler(json.data);
//	//			});
//	//		}
//	//	}
//	//	catch (e) {
//	//		console.error(e);
//	//	}
//	//};

//	//ws.onerror = (err) => {
//	//	console.error("ws error", err);
//	//};
//});

//type ServerSchemaPath<T extends WsSchema<any, any>> = T extends WsSchema<infer Path, any> ? ConcretePath<Path> : never;

//type ConcretePath<T extends string> =
//	T extends `${infer Head}/:${string}/${infer Tail}`
//	? `${Head}/${string}/${ConcretePath<Tail>}`
//	: T extends `${infer Head}/:${string}`
//	? `${Head}/${string}`
//	: T;

//export type WsClient<T extends WsSchema<any, any>> = T extends WsSchema<any, infer R> ? ConnectedSocket<R> : never;

//type ConnectedSocket<T extends WsRoutes | WsControllerCtor, ServerEvents extends string = ServerRouteKeys<T>, ClientEvents extends string = ClientRouteKeys<T>> = {
//	readonly on: <K extends ClientEvents>(event: K, callback: () => void | Promise<void>) => void;
//	readonly remove: <K extends ClientEvents>(event: K, callback: () => void | Promise<void>) => void;
//	readonly emit: <K extends ServerEvents>(event: K, callback: () => void | Promise<void>) => void;
//}

//type ServerRouteKeys<T extends WsRoutes | WsControllerCtor> = T extends WsControllerCtor ? ControllerKeys<InstanceType<T>> : {
//	[K in keyof T]:
//	K extends string ? (
//		T[K] extends WsControllerCtor ? `${K}.${ControllerKeys<InstanceType<T[K]>>}` :
//		T[K] extends WsRoutes ? `${K}.${ServerRouteKeys<T[K]>}` :
//		never
//	) : never;
//}[keyof T];


//type ClientRouteKeys<T extends WsRoutes | WsControllerCtor> = T extends WsControllerCtor ? ControllerKeys<InstanceType<T>> : {
//	[K in keyof T]:
//	K extends string ? (
//		T[K] extends WsControllerCtor ? `${K}.${ClientControllerKeys<InstanceType<T[K]>>}` :
//		T[K] extends WsRoutes ? `${K}.${ServerRouteKeys<T[K]>}` :
//		never
//	) : never;
//}[keyof T];

//type ControllerKeys<T extends WsController> = {
//	[K in keyof T]: T[K] extends (socket: Socket<any>, ...args: any[]) => void | Promise<void> ? K extends string ? K : never : never;
//}[keyof T];

//type ClientControllerKeys<T extends WsController> = {
//	[K in keyof T]: T[K] extends (socket: Socket<any>, ...args: any[]) => void | Promise<void> ? never : K extends string ? K : never;
//}[keyof T];

