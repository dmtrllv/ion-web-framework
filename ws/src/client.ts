import { ServerEvents, ClientEvents } from "./schema.js";

export const client = (host: string = window.location.host): Promise<WsClient> => new Promise(res => {
	const ws = new WebSocket(`ws://${host}`);

	const handlers: Record<keyof ServerEvents, any[]> = {};

	ws.onopen = () => {
		res({
			on(key, callback) {
				if (!handlers[key])
					handlers[key] = [] as any;
				handlers[key]!.push(callback);
			},
			remove(key, callback) {
				if (!handlers[key])
					return;

				const index = handlers[key]!.indexOf(callback);
				if (index > -1)
					handlers[key]!.splice(index, 1);
			},
			emit(event, ...data) {
				ws.send(JSON.stringify({ event, data: data[0] }));
			},
			onClose(callback: (e: CloseEvent) => any) {
				ws.onclose = callback;
			},
		});
	};

	ws.onmessage = (event) => {
		try {
			const json = JSON.parse(event.data);
			if ("event" in json) {
				const e = json.event as string;
				const h = (handlers[e as keyof ServerEvents] || []) as any[];
				h.forEach(handler => {
					handler(json.data);
				});
			}
		}
		catch (e) {
			console.error(e);
		}
	};

	ws.onerror = (err) => {
		console.error("ws error", err);
	};
});

export type WsClient = {
	readonly on: <K extends keyof ServerEvents>(key: K, callback: (data: ServerEvents[K]) => any) => void;
	readonly remove: <K extends keyof ServerEvents>(key: K, callback: (data: ServerEvents[K]) => any) => void;
	readonly emit: <K extends keyof ClientEvents>(key: K, ...args: EmitArgs<K>) => void;
	readonly onClose: (callback: (e: CloseEvent) => any) => void;
}

type EmitArgs<K extends keyof ClientEvents> = [ClientEvents[K]] extends [void] ? [] : [data: ClientEvents[K]];