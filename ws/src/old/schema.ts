//import { WsControllerCtor } from "./transport.js";

//export type WsRoutes = {
//	readonly [key: string]: WsRoutes | WsControllerCtor;
//};

//export const createSchema = <const Path extends string, const Routes extends WsRoutes | WsControllerCtor>(path: Path, routes: Routes): WsSchema<Path, Routes> => {
//	return {
//		path,
//		routes
//	};
//};

//export type WsSchema<Path extends string, Routes extends WsRoutes | WsControllerCtor> = {
//	readonly path: Path;
//	readonly routes: Routes;
//};