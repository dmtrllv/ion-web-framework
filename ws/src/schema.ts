import { WsControllerCtor } from "./transport.js";

export type ServerRoutes = {
	readonly [key: string]: ServerRoutes | WsControllerCtor;
};

export const createServerSchema = <const Path extends string, const Routes extends ServerRoutes>(path: Path, routes: Routes): ServerSchema<Path, Routes> => {
	return {
		path,
		routes
	};
};

export type ServerSchema<Path extends string, Routes extends ServerRoutes> = {
	readonly path: Path;
	readonly routes: Routes;
};