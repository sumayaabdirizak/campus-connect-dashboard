/** Shared refresh settings for course tab list queries. */
export type LiveQueryOptions = {
  /** Poll + treat data as stale while the tab is open. */
  live?: boolean;
};

export const COURSE_LIVE_STALE_MS = 60_000;
/** Cross-user updates (grades, new posts) while a live tab is open. */
export const COURSE_LIVE_REFETCH_INTERVAL_MS = 60_000;

export function withCourseLiveRefresh(live = false) {
  return {
    staleTime: live ? 30_000 : COURSE_LIVE_STALE_MS,
    refetchOnWindowFocus: true as const,
    refetchInterval: live ? COURSE_LIVE_REFETCH_INTERVAL_MS : (false as const),
  };
}
