import { Context } from "@ion/core";
import { User } from "../../entities/user.js";
import { IncomingMessage } from "node:http";

const parseCookies = (req: IncomingMessage): Record<string, string> => {
	const header = req.headers.cookie;
	if (!header)
		return {};

	return header.split(";").reduce((cookies: Record<string, string>, pair) => {
		const idx = pair.indexOf("=");
		if (idx === -1) return cookies;

		const key = pair.slice(0, idx).trim();
		const value = pair.slice(idx + 1).trim();

		cookies[key] = decodeURIComponent(value);
		return cookies;
	}, {});
}

export class Session extends Context {
	static from(req: IncomingMessage) {
		const cookies = parseCookies(req);
		const sid = cookies["sid"];
		if(sid) {			
			return new this({ id: User.id(parseInt(sid)), username: "admin" });
		}
		return new this({ id: User.id(Date.now()), username: "random" });
	}

	public user: User;

	public constructor(user: User) {
		super();
		this.user = user;
	}
}