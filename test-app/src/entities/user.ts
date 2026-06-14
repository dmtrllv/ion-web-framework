import { Entity } from "@ion/core";

export class User extends Entity<User> {
	//@serializable()
	public username!: string;
}