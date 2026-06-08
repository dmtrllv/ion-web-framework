import type { ServerApi } from "../http/api.js";
import { clientApi } from "@ion/http/client";

export const api = await clientApi<ServerApi>("/api"); 