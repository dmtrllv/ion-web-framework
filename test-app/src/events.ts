declare module "@ion/core" {
	interface DomainEvents {
		test: 123;
	}
}

declare module "@ion/ws" {
	interface ServerEvents {
		userOnline: number;
		userOffline: number;
	}
	
	interface ClientEvents {
		notifyOnline: void;
		notifyOffline: void;
	}
}