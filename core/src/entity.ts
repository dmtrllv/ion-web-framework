export abstract class Entity<T extends Entity<T>> {
	public static id<T extends Entity<T>>(this: EntityType<T>, id: number): Id<T> {
		return Object.assign(Number(id), {
			[ENTITY_TYPE]: this
		});
	}

	public readonly id!: Id<T>;
}

export type EntityType<T extends Entity<T>> = new (...args: any[]) => T;

export const ENTITY_TYPE = Symbol();

export type Id<T extends Entity<T>> = number & { readonly [ENTITY_TYPE]: EntityType<T> };