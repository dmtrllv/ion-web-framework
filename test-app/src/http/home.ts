import { get, html, HttpController } from "@ion/http";

export class HomeController extends HttpController {
	@get("/")
	public async home() {
		return html("<h1>Hello!</h1>");
	}
}