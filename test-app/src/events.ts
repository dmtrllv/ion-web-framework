declare module "@ion/core" {
	interface DomainEvents {
		broadcastMessage: { username: string; message: string; chatRoom: number ; };
		chatConnected: { username: string, chatRoom: number; };
		chatDisconnected: { username: string, chatRoom: number; };
	}
}

//declare module "@ion/ws" {
//	interface ServerEvents {
//		userOnline: { username: string; };
//		userOffline: { username: string; };
//	}
	
//	interface ClientEvents {
		
//	}
//}