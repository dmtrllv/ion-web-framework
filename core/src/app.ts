import { Controller, ControllerType, Transport, TransportType } from "./transport.js";
import type { DomainEvents, EventBinding } from "./events.js";
import { Service, ServiceType } from "./service.js";
import { ConnectionRegistry, EventDispatcher, EmitTarget } from "./connection.js";

export class App {
	private static readonly eventBindings = new Map<string, Map<TransportType<any>, EventBinding<any>[]>>();

	public static readonly onEvent = <K extends keyof DomainEvents, Target extends Controller<any, any>, Key extends keyof Target>(event: K) => (target: Target, method: Key) => {
		const controller = target.constructor as ControllerType<any, any, any>;

		if (!this.eventBindings.has(event)) {
			this.eventBindings.set(event, new Map());
		}

		const bindings = this.eventBindings.get(event)!;

		if (!bindings.has(controller.transport)) {
			bindings.set(controller.transport, []);
		}

		bindings.get(controller.transport)!.push({
			method,
			controller
		});
	}

	public static getEventBindings = <K extends keyof DomainEvents>(event: K): ReadonlyMap<TransportType<any>, EventBinding<any>[]> | null => {
		return App.eventBindings.get(event) || null;
	}

	private readonly transports = new Map<TransportType<any>, [Transport<any, any>, any]>();
	public readonly connectionRegistry = new ConnectionRegistry<DomainEvents>();
	private readonly eventDispatcher = new EventDispatcher<DomainEvents>(this, this.connectionRegistry);

	private readonly services = new Map<ServiceType<any>, Service>();

	public use<T extends Transport<any, any>>(...[transport, config]: UseTransportArgs<T>): T {
		if (this.transports.has(transport)) {
			throw new Error(`Transport ${transport.name} is already registered!`);
		}
		const instance = new (transport as any)(this);
		this.transports.set(transport, [instance, config]);
		return instance;
	}

	public getTransport<T extends Transport<any, any>>(type: TransportType<T>): T {
		const transport = this.transports.get(type);
		if (!transport)
			throw new Error(`Could not get transport ${type.name}!`);
		return transport[0] as T;
	}

	public async start() {
		this.initializeServices();

		await Promise.all(this.transports.values().map(([transport, config]) => transport.configure(config)));
		await Promise.all(this.transports.values().map(([transport]) => transport.start()));
	}

	private initializeServices() {
		for (const [_, props] of Service.getRegisteredServices()) {
			for (const k in props) {
				const service = props[k]!;
				if (!this.services.has(service)) {
					this.services.set(service, new service(this));
				}
			}
		}
		for (const [_, props] of Service.getRegisteredServices()) {
			for (const k in props) {
				this.injectServices(this.services.get(props[k]!)!);
			}
		}
	}

	public injectServices(target: Service | Controller<any, any>) {
		const props = Service.getRegisteredServices().get(target.constructor as any);
		if (!props)
			return;
		for (const k in props) {
			const service = this.services.get(props[k]!);
			if (service) {
				Object.assign(target, {
					[k]: service
				});
			}
		}
	}

	public async stop() {
		await Promise.all(this.transports.values().map(([transport]) => transport.stop()));
	}

	public emit<K extends keyof DomainEvents>(event: K, data: DomainEvents[K], target: EmitTarget = { type: "all" }) {
		this.eventDispatcher.emit(event, data, target);
	}
}

type UseTransportArgs<T extends Transport<any, any>> = [TransportType<T>, ...Parameters<T["configure"]>];
