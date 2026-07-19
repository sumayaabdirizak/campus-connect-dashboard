import { registerTypingHandlers } from "./typing-events.js";
import { registerReadReceiptHandlers } from "./read-receipts.js";
import { registerPresenceDisconnectHandlers } from "./presence-disconnect.js";

/** @param {import("socket.io").Socket} socket @param {object} ctx */
export function registerTypingPresenceHandlers(socket, ctx) {
  registerTypingHandlers(socket, ctx);
  registerReadReceiptHandlers(socket, ctx);
  registerPresenceDisconnectHandlers(socket, ctx);
}
