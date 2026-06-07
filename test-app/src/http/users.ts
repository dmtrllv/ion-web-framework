import { HttpController, get, html, param, route } from "@ion/http";

@route("/users")
export class UsersController extends HttpController {

	@get("/all")
	public all() {
		return [];
	}

	@get("/:id")
	public byId(@param(":id") id: number) {
		return html(`<h1>ById ${id}</h1>`);
	}

	
	@get("/:id/info")
	public userInfo(@param(":id") id: number) {
		return html(`<h1>User Info for id: ${id}</h1>`);
	}
}