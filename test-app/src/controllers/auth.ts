import { body, get, HttpController, route } from "@ion/http";
import { AuthService, type LoginData } from "../services/auth.js";
import { service } from "@ion/core";

@route("/auth")
export class AuthController extends HttpController {
	@service()
	public readonly authService!: AuthService;

	@get("/login")
	public async login(@body() { username, password }: LoginData) {
		// todo: use service
		console.log({ s: this.authService });
		return username === password;
	}
}
