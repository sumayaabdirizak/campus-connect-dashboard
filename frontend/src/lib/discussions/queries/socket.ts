'use client';

/** Singleton socket.io client for the Discussions module. */

export type { Socket } from 'socket.io-client';
export type { RoomKey } from '@/lib/discussions/queries/socket-state';
export { getReconnectGeneration, subscribeReconnect } from '@/lib/discussions/queries/socket-state';
export { getDiscussionSocket, joinRoom, leaveRoom } from '@/lib/discussions/queries/socket-rooms';
export { emitTypingStart, emitTypingStop, emitMessageRead } from '@/lib/discussions/queries/socket-rooms';
