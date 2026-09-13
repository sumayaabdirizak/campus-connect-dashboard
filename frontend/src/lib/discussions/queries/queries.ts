/**
 * React-query hooks + key factory for the Discussions module.
 * Prefer importing from this barrel (or '@/features/discussions/api').
 */

export type { SearchFilterParams } from '@/lib/discussions/queries/service';
export { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
export * from '@/lib/discussions/queries/server-channel-queries';
export * from '@/lib/discussions/queries/group-dm-queries';
export * from '@/lib/discussions/queries/unread-queries';
export * from '@/lib/discussions/queries/message-mutations';
export * from '@/lib/discussions/queries/pin-mutations';
export * from '@/lib/discussions/queries/channel-mutations';
export * from '@/lib/discussions/queries/channel-overwrite-queries';
export * from '@/lib/discussions/queries/channel-overwrite-mutations';
export * from '@/lib/discussions/queries/member-mutations';
export * from '@/lib/discussions/queries/group-dm-mutations';
export * from '@/lib/discussions/queries/status-notification-queries';
export { discussionCache } from '@/lib/discussions/queries/discussion-cache';
