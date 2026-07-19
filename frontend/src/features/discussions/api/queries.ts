/**
 * React-query hooks + key factory for the Discussions module.
 * Prefer importing from this barrel (or '@/features/discussions/api').
 */

export type { SearchFilterParams } from './service';
export { discussionKeys } from './discussion-keys';
export * from './server-channel-queries';
export * from './group-dm-queries';
export * from './unread-queries';
export * from './message-mutations';
export * from './pin-mutations';
export * from './channel-mutations';
export * from './channel-overwrite-queries';
export * from './channel-overwrite-mutations';
export * from './member-mutations';
export * from './group-dm-mutations';
export * from './status-notification-queries';
export { discussionCache } from './discussion-cache';
