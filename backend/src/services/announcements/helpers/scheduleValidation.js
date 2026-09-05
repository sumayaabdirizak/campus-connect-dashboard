export function getAnnouncementScheduleMinLeadMs() {
  const sec = Number(process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS ?? 120);
  if (!Number.isFinite(sec)) return 120_000;
  return Math.min(Math.max(Math.trunc(sec), 60), 86400) * 1000;
}

/**
 * Validates `publishedAt` when the client intends to schedule (non-draft).
 * Immediate publish (`status: PUBLISHED`) may send `publishedAt` ≈ now — that is allowed.
 * Future-only rules apply when scheduling (`SCHEDULED` or unspecified status with a date).
 * @param {{ status?: string; publishedAt?: Date | null }} input
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function validatePublishedAtForScheduleUpsert(input) {
  const status = String(input.status ?? "").toUpperCase();
  if (status === "DRAFT") return { ok: true };

  const pub = input.publishedAt;
  if (pub == null) return { ok: true };
  const t = pub instanceof Date ? pub.getTime() : new Date(pub).getTime();
  if (Number.isNaN(t)) {
    return { ok: false, status: 400, message: "publishedAt is invalid" };
  }

  // Publish now: client sends publishedAt ≈ Date.now(); allow past/now and modest clock skew.
  if (status === "PUBLISHED") {
    if (t > Date.now() + getAnnouncementScheduleMinLeadMs()) {
      return {
        ok: false,
        status: 400,
        message: "Use status SCHEDULED when publishedAt is in the future",
      };
    }
    return { ok: true };
  }

  const now = Date.now();
  if (t <= now) {
    return { ok: false, status: 400, message: "publishedAt must be in the future" };
  }
  const min = now + getAnnouncementScheduleMinLeadMs();
  if (t < min) {
    return {
      ok: false,
      status: 400,
      message: `publishedAt must be at least ${Math.round(getAnnouncementScheduleMinLeadMs() / 60000)} minute(s) in the future`,
    };
  }
  return { ok: true };
}
