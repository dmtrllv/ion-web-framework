import { HttpMethod, HttpTransport, RouteMeta } from "./transport.js";

import posixPath from "node:path/posix";

type ConcreteRoutes = Record<HttpMethod, Record<string, RouteMeta<any, any>>>;
type ParamTrees = Record<HttpMethod, RouteNode>;

type RouteNode = {
	children: Record<string, RouteNode>;
	route: RouteMeta<any, any> | null;
	paramRoute: ParamRoute | null;
};

type ParamRoute = RouteNode & {
	paramName: string;
};

export class Router {
	private readonly concreteRoutes: ConcreteRoutes = {
		get: {},
		post: {},
		put: {},
		delete: {},
	};

	// @ts-ignore
	private readonly paramTree: ParamTrees = {
		get: {
			children: {},
			paramRoute: null,
			route: null,
		},
		post: {
			children: {},
			paramRoute: null,
			route: null,
		},
		put: {
			children: {},
			paramRoute: null,
			route: null,
		},
		delete: {
			children: {},
			paramRoute: null,
			route: null,
		},
	};

	public constructor() { }

	public register(method: HttpMethod, path: string, route: RouteMeta<any, any>) {
		const barsePath = HttpTransport.getBasePath(route.controller);
		path = posixPath.join(barsePath, path);
		const parts = path.split("/").filter(s => !!s);
		if (parts.find(s => s.startsWith(":"))) {
			let target: ParamRoute | RouteNode = this.paramTree[method];
			parts.forEach(p => {
				if (p.startsWith(":")) {
					if (!target.paramRoute)
						target.paramRoute = {
							children: {},
							paramName: p,
							route: null,
							paramRoute: null,
						}
					target = target.paramRoute;
				} else {
					if (!target.children[p])
						target.children[p] = {
							children: {},
							route: null,
							paramRoute: null
						}
					target = target.children[p];
				}
			});

			target.route = route;
		} else {
			this.concreteRoutes[method][path] = route;
		}
	}

	public readonly resolve = (method: HttpMethod, path: string) => {
		let route = this.concreteRoutes[method][path];
		if (route)
			return route;

		route = this.resolveParamRoute(method, path);
		return route || null;
	}

	public resolveParamRoute(method: HttpMethod, path: string): RouteMeta<any, any> | undefined {
		const parts = path.split("/").filter(s => !!s);

		let target: ParamRoute | RouteNode = this.paramTree[method];

		for (const p of parts) {
			if (p in target.children) {
				target = target.children[p]!;
			} else if (target.paramRoute) {
				target = target.paramRoute
			} else {
				return undefined;
			}
		}

		return target.route || undefined;
	}
}