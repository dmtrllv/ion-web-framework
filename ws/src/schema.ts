import { WsControllerCtor } from "./transport.js";

/**
 * Define events send from the server.
 */
export declare interface ServerEvents {

}

/**
 * Define events send from the client. 
 * This will be used to register ws controller methods to.
 */
export declare interface ClientEvents {

}

export const createWsSchema = <T extends WsSchema>(schema: T): T => {
	return schema;
}

export type WsSchema = {
	[key: string]: WsControllerCtor | WsSchema;
};