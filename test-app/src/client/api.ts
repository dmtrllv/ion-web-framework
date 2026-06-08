import type { ServerApi } from "../controllers/api.js";
import { clientApi } from "@ion/http/client";

export const api = await clientApi<ServerApi>("/api"); 