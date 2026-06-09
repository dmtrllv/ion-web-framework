import { App } from "./app.js";

export type Context<I, O> = {
	readonly input: I;
	readonly output: O;
}

declare const INPUT_TAG: unique symbol;
declare const OUTPUT_TAG: unique symbol;

const EXTRACTORS = Symbol();

export abstract class Transport<I, O> {
	declare protected readonly [INPUT_TAG]: I;
	declare protected readonly [OUTPUT_TAG]: O;
	
	public static Controller<T extends Transport<any, any>,StaticProps extends {} = {}>(this: new (app: App) => T, staticProps: StaticProps = {} as any): TransportControllerCtor<T> & StaticProps {
		const className = `${this.name}Controller`;
		const classObjects: { [key: typeof className]: TransportControllerCtor<T> } = {
			[className]: class extends Controller<any, any> { } as any
		};
		return Object.assign(classObjects[className]!, staticProps);
	}
	
	// creates a parameter decorators that extracts and returns data from the input
	public static createExtractor<T extends Transport<any, any>, Args extends any[]>(this: new (app: App) => T, extractor: Extractor<T, Args>): ExtractorDecorator<T, Args> {
		const decorator: ExtractorDecorator<T, Args> = Object.assign((...args: Args) => (target: any, key: any, index: any) => {
			let extractors = Reflect.getMetadata(EXTRACTORS, target, key);
			if (extractors === undefined) {
				extractors = [];
				Reflect.defineMetadata(EXTRACTORS, extractors, target, key);
			}
			const params = Reflect.getMetadata("design:paramtypes", target, key) || [];
			extractors[index] = {
				args,
				extractor,
				paramType: params[index]
			};
		}, {
			extractor
		});
		
		return decorator;
	}
	
	public static getExtractors<T extends Transport<any, any>, Target extends TransportController<T>>(this: new (app: App) => T, target: Target, key: keyof Target & (string | symbol)): RegisteredExtractor<T, any[]>[] {
		return Reflect.getMetadata(EXTRACTORS, target, key) || []
	}
	
	protected readonly app: App;
	
	public constructor(app: App) { this.app = app; }
	
	public abstract configure(config?: any): void | Promise<void>;
	public start(): void | Promise<void> {}
	public stop(): void | Promise<void> {}
}

type TransportController<T extends Transport<any, any>> = InstanceType<TransportControllerCtor<T>>;

export type ControllerType<I, O> = new (transport: Transport<I, O>) => Controller<I, O>;

type ExtractorDecorator<T extends Transport<any, any>, Args extends any[]> = (<Target extends TransportController<T>, K extends keyof Target & (string | symbol), I>(...args: Args) => (target: Target, key: K, index: I) => any) & {
	readonly extractor: Extractor<T, Args>;
};

type Extractor<T extends Transport<any, any>, Args extends any[]> = (ctx: ExtractorContext<T>, ...args: Args) => any;

export type ExtractorContext<T extends Transport<any, any>> = {
	readonly input: InferInput<T>;
	readonly paramType: any;
	readonly controller: TransportControllerCtor<T>;
	readonly key: string | symbol;
	readonly transport: T;
};

export type RegisteredExtractor<T extends Transport<any, any>, Args extends any[]> = {
	readonly args: Args;
	readonly extractor: Extractor<T, Args>
	readonly paramType: any;
};

type InferInput<T> = T extends Transport<infer I, any> ? I : never;

type TransportControllerCtor<T> = T extends Transport<infer I, infer O> ? ControllerCtor<T, I, O> : never;

type ControllerCtor<T extends Transport<I, O>, I, O> = (new () => Controller<I, O> & { transport: T }) & {
	// TODO: Does this work?
	readonly constructor: ControllerCtor<T, I, O>;
};

export class Controller<I, O> {
	protected transport: Transport<I, O>;

	public constructor(transport: Transport<I, O>) {
		this.transport = transport;
	}
}

export interface UpgradableTransport<Args extends any[]> {
	onUpgrade(handler: UpgradeHandler<Args>): void;
}

export type UpgradeHandler<Args extends any[]> = (...args: Args) => void;