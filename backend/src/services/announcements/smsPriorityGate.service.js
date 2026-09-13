/** @param {string | undefined | null} p */
function priorityRank(p) {
  const u = String(p ?? "NORMAL").toUpperCase();
  if (u === "URGENT") return 3;
  if (u === "IMPORTANT") return 2;
  return 1;
}

/**
 * Minimum announcement priority required to send SMS.
 * `ANNOUNCEMENT_SMS_MIN_PRIORITY`: unset → all priorities; `NORMAL` | `IMPORTANT` | `URGENT`.
 * Example: `URGENT` → only URGENT announcements trigger SMS (when other gates pass).
 */
export function minSmsPriorityRankFromEnv() {
  const raw = String(process.env.ANNOUNCEMENT_SMS_MIN_PRIORITY ?? "").trim().toUpperCase();
  if (!raw) return 1;
  if (raw === "NORMAL") return 1;
  if (raw === "IMPORTANT") return 2;
  if (raw === "URGENT") return 3;
  return 1;
}

/**
 * @param {import("@prisma/client").Announcement | { priority?: string | null }} announcement
 */
export function announcementMeetsSmsPriorityGate(announcement) {
  return priorityRank(announcement.priority) >= minSmsPriorityRankFromEnv();
}
