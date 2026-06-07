import { HttpControllerCtor } from "./transport.js";

export type ApiSchema<Path extends string, T extends ApiRoutes> = {
	readonly path: Path;
	readonly routes: T;
};

export type ApiRoutes = {
	readonly [key: string]: ApiRoutes | HttpControllerCtor;
};

export const createApi = <Path extends string, T extends ApiRoutes>(path: Path, routes: T): ApiSchema<Path,T> => {
	return {
		path,
		routes
	};
};