declare module "@ion/core" {
	interface DomainEvents {
		broadcastMessage: { userId: number; username: string, message: string; chatRoom: number ; };
		chatConnected: { username: string, chatRoom: number; };
		chatDisconnected: { username: string, chatRoom: number; };
	}
}