import { ControllerType } from "./transport.js";

export declare interface DomainEvents {
	
}

export declare type DomainEventData<T extends keyof DomainEvents> = DomainEvents[T];


export type EventBinding<T extends ControllerType<any, any, any>> = {
	readonly controller: T;
	readonly method: keyof InstanceType<T>;
};
