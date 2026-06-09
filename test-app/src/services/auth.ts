import { Service } from "@ion/core";

export class AuthService extends Service {


	public login({ username, password }: LoginData) {
		console.log(username, password);
	}
}

export type LoginData = {
	username: string;
	password: string;
};