/** Shared React Query defaults — sockets invalidate; poll is a fallback. */
export const ANNOUNCEMENT_STALE_MS = 60_000;
/** Fallback when a socket event is missed (e.g. scheduled → published). */
export const ANNOUNCEMENT_REFETCH_INTERVAL = 45_000;
