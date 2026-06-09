import { Service } from "@ion/core";

export class AuthService extends Service {


	public async login({ username, password }: LoginData): Promise<boolean> {
		if(username !== password) {
			return false;
		}

		return true;
	}
}

export type LoginData = {
	username: string;
	password: string;
};