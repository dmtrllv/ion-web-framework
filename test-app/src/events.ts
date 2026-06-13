declare module "@ion/core" {
	interface DomainEvents {
		broadcastMessage: { username: string, message: string; };
		chatConnected: { username: string; };
		chatDisconnected: { username: string; };
	}
}