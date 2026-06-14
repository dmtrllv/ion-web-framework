import { App } from "./app.js";
import { Transport, TransportType } from "./transport.js";

export abstract class ConnectionRoute {
	public static create<T extends typeof ConnectionRoute>(this: new (...args: ConstructorParameters<T>) => InstanceType<T>, ...args: ConstructorParameters<T>): InstanceType<T> {
		return new this(...args);
	}

	public readonly id: number;

	public constructor(id: number) {
		this.id = id;
	}

	public get key(): string {
		return `${this.constructor.name}:${this.id}`;
	}
}

export abstract class Connection<T extends Record<string, any>> {
	private static _idCounter: number = 0;

	public static readonly nextId = () => this._idCounter++;

	public readonly id: number;

	protected readonly routes: Set<ConnectionRoute> = new Set();

	private readonly eventHandlers: Map<keyof ConnectionEvents<T>, Function[]> = new Map();

	public readonly bind: (route: ConnectionRoute) => void;
	public readonly unbind: (route: ConnectionRoute) => void;
	private readonly transport: Transport<any, any>;

	constructor(registry: ConnectionRegistry<T>, transport: Transport<any, any>, id: number) {
		this.id = id;
		this.transport = transport;

		this.bind = (route: ConnectionRoute) => {
			this.routes.add(route);
			registry.bindRoute(this.id, route);
		};

		this.unbind = (route: ConnectionRoute) => {
			this.routes.delete(route);
			registry.unbindRoute(this.id, route);
		};
	}

	abstract emit<K extends keyof T>(event: K, payload: T[K]): void;

	public getRoutes(): ConnectionRoute[] {
		return [...this.routes];
	}

	public on<K extends keyof ConnectionEvents<T>>(event: K, handler: (...data: ConnectionEvents<T>[K]) => any) {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler);
	}

	public remove<K extends keyof ConnectionEvents<T>>(event: K, handler: (...data: ConnectionEvents<T>[K]) => any) {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	public disconnect() {
		this.eventHandlers.get("disconnect")?.forEach(h => h(this));
	}
}

export type ConnectionEvents<T extends Record<string, any>> = {
	disconnect: [connection: Connection<T>];
}

export class ConnectionRegistry<T extends Record<string, any>> {
	private connections = new Map<TransportType<any>, Map<number, Connection<T>>>();
	private idToConnection = new Map<number, Connection<T>>();

	private indices = new Map<ConnectionRoute, Set<number>>();

	public add(connection: Connection<T>) {
		const transport = connection["transport"].constructor as TransportType<any>;
		if (!this.connections.has(transport))
			this.connections.set(transport, new Map())

		const connections = this.connections.get(transport)!;
		connections.set(connection.id, connection);

		this.idToConnection.set(connection.id, connection);

		for (const route of connection.getRoutes()) {
			if (!this.indices.has(route)) {
				this.indices.set(route, new Set());
			}

			this.indices.get(route)!.add(connection.id);
		}
	}

	public remove(id: number) {
		const connection = this.get(id);
		if (!connection)
			return;

		connection.disconnect();

		const transport = connection["transport"].constructor as TransportType<any>;;
		const connections = this.connections.get(transport)!;

		for (const route of connection.getRoutes()) {
			this.indices.get(route)?.delete(connection.id);

			if (this.indices.get(route)?.size === 0) {
				this.indices.delete(route);
			}
		}

		this.idToConnection.delete(connection.id);
		connections.delete(connection.id);
	}

	public get(id: number): Connection<T> | undefined {
		return this.idToConnection.get(id);
	}

	public all(): Iterable<Connection<T>> {
		return this.idToConnection.values();
	}

	public getByRoute(route: ConnectionRoute): Connection<T>[] {
		const ids = this.indices.get(route);
		if (!ids)
			return [];

		const result: Connection<T>[] = [];

		for (const id of ids) {
			const conn = this.get(id);
			if (conn)
				result.push(conn);
		}

		return result;
	}

	public getByTransport(transport: TransportType<any>): Connection<T>[] {
		const connections = this.connections.get(transport);
		if (connections)
			return Array.from(connections.values());
		return [];
	}

	public getByTransportRoute(route: ConnectionRoute, transport: TransportType<any>): Connection<T>[] {
		const ids = this.indices.get(route);

		if (!ids)
			return [];

		const connections = this.connections.get(transport);

		if (!connections)
			return [];

		const result: Connection<T>[] = [];

		for (const id of ids) {
			const conn = connections.get(id);
			if (conn)
				result.push(conn);
		}

		return result;
	}

	public bindRoute(id: number, route: ConnectionRoute) {
		const connection = this.get(id);

		if (!connection)
			return;

		if (!this.indices.has(route)) {
			this.indices.set(route, new Set());
		}

		this.indices.get(route)!.add(id);
	}

	public unbindRoute(connectionId: number, route: ConnectionRoute) {
		const connection = this.get(connectionId);

		if (!connection)
			return;

		const set = this.indices.get(route);

		if (!set)
			return;

		set.delete(connectionId);

		if (set.size === 0) {
			this.indices.delete(route);
		}
	}
}

export type EmitTarget = ConnectionRoute | { type: "all" };

export class EventDispatcher<T extends Record<string, any>> {
	private readonly app: App;
	private readonly registry: ConnectionRegistry<T>;

	public constructor(app: App, registry: ConnectionRegistry<T>) {
		this.app = app;
		this.registry = registry;
	}

	public emit<K extends keyof T>(event: K, payload: T[K], target: EmitTarget = { type: "all" }) {
		const bindings = App.getEventBindings(event as never);
		if (!bindings)
			return;

		for (const [type, b] of bindings) {
			const transport = this.app.getTransport(type) as Transport<any, any>;
			if (transport) {
				let connections: ReadonlyArray<Connection<any>>;
				if (target instanceof ConnectionRoute) {
					connections = this.registry.getByTransportRoute(target, type);
				} else {
					connections = this.registry.getByTransport(type);
				}

				b.forEach(b => transport.resolveEvent(event as never, payload as never, b, connections));
			}
		}
	}
}