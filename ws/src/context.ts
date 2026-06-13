export abstract class WsContext {
	public constructor() {}
}

export type WsContextType<T extends WsContext> = new () => T;
//type WsContextType<T extends WsContext> = T extends new (...args: infer Args) => WsContext ? [] extends Args ? true : false : false;
