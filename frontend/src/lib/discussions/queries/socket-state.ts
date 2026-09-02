import type { Socket } from 'socket.io-client';

export type RoomKey =
  | `channel:${string}`
  | `groupdm:${string}`
  | `user:${number}`
  | `discussion:${string}`;

export let socket: Socket | null = null;
let listenersBound = false;
export const roomRefCounts = new Map<RoomKey, number>();

export function isListenersBound() {
  return listenersBound;
}

export function setListenersBound(value: boolean) {
  listenersBound = value;
}

let reconnectGeneration = 0;
let hasConnectedOnce = false;
const reconnectListeners = new Set<(gen: number) => void>();

export function getReconnectGeneration(): number {
  return reconnectGeneration;
}

export function subscribeReconnect(listener: (gen: number) => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}

export function bumpReconnectGeneration() {
  reconnectGeneration += 1;
  for (const fn of reconnectListeners) fn(reconnectGeneration);
}

export function getHasConnectedOnce() {
  return hasConnectedOnce;
}

export function setHasConnectedOnce(value: boolean) {
  hasConnectedOnce = value;
}

export function setSocket(s: Socket | null) {
  socket = s;
}

export function getSocketRef(): Socket | null {
  return socket;
}
