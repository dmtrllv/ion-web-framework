import { Transport } from "./transport.js";

export class App {
	private readonly transports = new Map<TransportType<any>, [Transport<any, any>, any]>();

	public use<T extends Transport<any, any>>(...[transport, config]: UseTransportArgs<T>) {
		if(this.transports.has(transport)) {
			throw new Error(`Transport ${transport.name} is already registered!`);
		}
		this.transports.set(transport, [new (transport as any)(), config]);
	}

	public async start() {
		await Promise.all(this.transports.values().map(([transport, config]) => transport.configure(config)));
		await Promise.all(this.transports.values().map(([transport]) => transport.start()));
	}
	
	public async stop() {
		await Promise.all(this.transports.values().map(([transport]) => transport.stop()));
	}
}

type TransportType<T extends Transport<any, any>> = abstract new () => T;

type UseTransportArgs<T extends Transport<any, any>> = [TransportType<T>, ...Parameters<T["configure"]>];
