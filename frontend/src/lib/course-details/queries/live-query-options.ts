/** Shared refresh settings for course tab list queries. */
export type LiveQueryOptions = {
  /** Poll + treat data as stale while the tab is open. */
  live?: boolean;
};

export const COURSE_LIVE_STALE_MS = 60_000;
/** Socket / mutations invalidate; window-focus refetch catches stale tabs. */
export const COURSE_LIVE_REFETCH_INTERVAL = false as const;

export function withCourseLiveRefresh(live = false) {
  return {
    staleTime: live ? COURSE_LIVE_STALE_MS : COURSE_LIVE_STALE_MS,
    refetchOnWindowFocus: true as const,
    refetchInterval: COURSE_LIVE_REFETCH_INTERVAL,
  };
}
