declare module "@ion/core" {
	interface DomainEvents {
		broadcastMessage: { username: string, message: string; room: number; };
		chatConnected: { username: string; room: number; };
		chatDisconnected: { username: string; room: number; };
	}
}