import { Transport } from "./transport.js";

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
}

export class ConnectionRegistry<T extends Record<string, any>> {
	private connections = new Map<Transport<any, any>, Map<number, Connection<T>>>();
	private idToConnection = new Map<number, Connection<T>>();

	private indices = new Map<ConnectionRoute, Set<number>>();

	public add(connection: Connection<T>) {
		const transport = connection["transport"];
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
		if(!connection)
			return;
		const transport = connection["transport"];
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

	public getByTransportRoute(route: ConnectionRoute, transport: Transport<any, any>): Connection<T>[] {
		const ids = this.indices.get(route);

		if (!ids)
			return [];

		const connections = this.connections.get(transport);
		
		if(!connections)
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
	private readonly registry: ConnectionRegistry<T>

	public constructor(registry: ConnectionRegistry<T>) {
		this.registry = registry;
	}

	public emit<K extends keyof T>(event: K, payload: T[K], target: EmitTarget = { type: "all" }) {
		let connections: Iterable<Connection<T>>;

		if (target instanceof ConnectionRoute) {
			connections = this.registry.getByRoute(target);
		} else {
			connections = this.registry.all();
		}

		for (const connection of connections) {
			// this is not right yet. controllers should be created and then the methods should be called 
			connection.emit(event, payload);
		}
	}
}