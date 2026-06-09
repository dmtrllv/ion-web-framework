import { client } from "@ion/ws/client";

import { type ChatSchema } from "../controllers/ws/index.js";

export const connectToChat = (id: number) => client<ChatSchema>(`/chat/${id}`);