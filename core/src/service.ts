import { Controller, ControllerType } from "./transport.js";

export const SERVICE_TAG = Symbol();

type ServiceMap = Map<ControllerType<any, any> | ServiceType<any>, Record<string | number | symbol, ServiceType<any>>>;
type ReadonlyServiceMap = ReadonlyMap<ControllerType<any, any> | ServiceType<any>, Record<string | number | symbol, ServiceType<any>>>;

export abstract class Service {
	public readonly [SERVICE_TAG] = SERVICE_TAG;

	private static readonly registeredServices: ServiceMap = new Map();

	public static getRegisteredServices(): ReadonlyServiceMap {
		return this.registeredServices;
	}

	public static readonly register = (target: ControllerType<any, any> | ServiceType<any>, key: string | number | symbol, service: ServiceType<any>) => {
		const ctor = target.constructor as any;
		if (!this.registeredServices.has(ctor))
			this.registeredServices.set(ctor, {});
		this.registeredServices.get(ctor)![key] = service;
	};
}

export type ServiceType<T extends Service> = new () => T;

export const service = <T extends Controller<any, any> | Service, K extends keyof T>() => (target: T, key: K) => {
	const type = Reflect.getMetadata("design:type", target, key as any);
	Service.register(target as any, key, type);
}