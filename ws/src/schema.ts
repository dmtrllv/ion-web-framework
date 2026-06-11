import { WsControllerCtor } from "./transport.js";

export type WsSchema = {
	readonly [key: string]: WsSchema | WsControllerCtor;
};