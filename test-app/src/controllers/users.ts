import { HttpController, body, get, param, post, query, route } from "@ion/http";

@route("/users")
export class UsersController extends HttpController {
	private static readonly users: { name: string }[] = [];

	@get("/all")
	public all() {
		return UsersController.users.map((u, i) => ({ ...u, id: i }));
	}

	@get("/:id")
	public byId(@param(":id") id: number) {
		return UsersController.users[id] || null;
	}


	@post("/")
	public create(@body() name: string) {
		return UsersController.users.push({ name }) - 1;
	}

	@get("/queried")
	public queried(@query() q: any) {
		return { q };
	}
}