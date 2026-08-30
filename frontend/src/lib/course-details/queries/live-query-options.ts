/** Shared refresh settings for course tab list queries. */
export type LiveQueryOptions = {
  /** Poll + treat data as stale while the tab is open. */
  live?: boolean;
};

export const COURSE_LIVE_POLL_MS = 10_000;
export const COURSE_CHAT_POLL_MS = 5_000;


export function withCourseLiveRefresh(live = false) {
  return {
    staleTime: live ? 0 : undefined,
    refetchOnWindowFocus: true as const,
    refetchInterval: live ? COURSE_LIVE_POLL_MS : (false as const)
  };
}
