import { resolve } from "node:path";
import { ChildProcess, spawn, SpawnOptions } from "node:child_process";
import os from "node:os";
import { existsSync } from "node:fs";

const isWin = os.platform() === "win32";

function runNpm(command: string, cwd: string, options: SpawnOptions = {}) {
	if (!existsSync(cwd)) {
		throw new Error(`Directory does not exist: ${cwd}`);
	}

	return spawn("npm", ["run", command], {
		cwd,
		stdio: "inherit",
		shell: isWin,
		...options,
	});
}

const root = process.cwd();

const libs = ["core", "http", "ws"];

const children: ChildProcess[] = [];

for (const lib of libs) {
	const child = runNpm("watch", resolve(root, lib));
	children.push(child);
}

//const app = runNpm("dev", resolve(root, "test-app"));
//children.push(app);

function shutdown() {
	for (const c of children) {
		c.kill();
	}
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);