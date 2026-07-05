/** Resolve the authenticated user id from Express `req.user` (cookie JWT uses `sub`). */
export function getDiscussionCallerUserId(req) {
  return Number(req.user?.id ?? req.user?.sub) || null;
}
