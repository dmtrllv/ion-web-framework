import { Controller, Transport } from "./transport.js";
import type { DomainEvents } from "./events.js";
import { Service, ServiceType } from "./service.js";

export class App {
	private readonly transports = new Map<TransportType<any>, [Transport<any, any>, any]>();

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
					this.services.set(service, new service());
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

	public emit(key: keyof DomainEvents) { console.log(key) }
}

type TransportType<T extends Transport<any, any>> = abstract new (app: App) => T;

type UseTransportArgs<T extends Transport<any, any>> = [TransportType<T>, ...Parameters<T["configure"]>];
