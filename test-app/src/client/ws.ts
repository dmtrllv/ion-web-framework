import { WsClient } from "@ion/ws/client";
import { type MainWsEndpoint } from "../controllers/ws/index.js";

export const ws = new WsClient<MainWsEndpoint>("/ws");
