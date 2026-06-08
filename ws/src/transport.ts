import { Transport, UpgradableTransport } from "@ion/core";
import { IncomingMessage } from "node:http";

export type WsConfig = {
	server: UpgradableTransport<[IncomingMessage]>;
};

export class WsTransport extends Transport<any, any> {
	override configure({ server }: WsConfig): void | Promise<void> {
		server.onUpgrade(this.onUpgrade);
	}

	private readonly onUpgrade = (_req: IncomingMessage) => {

	}
}



export const WsController = WsTransport.Controller();

export type WsControllerCtor = typeof WsController;
export type WsController = InstanceType<typeof WsController>;
