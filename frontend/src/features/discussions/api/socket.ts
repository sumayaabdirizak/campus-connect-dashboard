'use client';

/** Singleton socket.io client for the Discussions module. */

export type { Socket } from 'socket.io-client';
export type { RoomKey } from './socket-state';
export { getReconnectGeneration, subscribeReconnect } from './socket-state';
export { getDiscussionSocket, joinRoom, leaveRoom } from './socket-rooms';
export { emitTypingStart, emitTypingStop, emitMessageRead } from './socket-rooms';
