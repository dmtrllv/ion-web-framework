export declare interface DomainEvents {
	
}

export declare type DomainEventData<T extends keyof DomainEvents> = DomainEvents[T];