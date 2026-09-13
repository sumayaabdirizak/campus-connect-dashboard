/**
 * Thin fetch wrappers around /api/discussions/*.
 * Pure functions — no caching, no React.
 */

export * from '@/lib/discussions/queries/server-channel-service';
export * from '@/lib/discussions/queries/message-service';
export * from '@/lib/discussions/queries/pin-service';
export * from '@/lib/discussions/queries/group-dm-service';
export * from '@/lib/discussions/queries/notification-service';
