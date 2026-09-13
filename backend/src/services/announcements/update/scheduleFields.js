import {
  getAnnouncementScheduleMinLeadMs,
  validatePublishedAtForScheduleUpsert,
  normalizePublishedAt,
} from "../announcementService.helpers.js";

/**
 * @param {object} announcement
 * @param {object} parsed
 * @returns {{ ok: false, status: number, message: string } | { ok: true, publishedAt: Date | null, forceDraftFromClearSchedule: boolean, explicitNextStatus: string | null, prevStatus: string }}
 */
export function resolveUpdateScheduleFields(announcement, parsed) {
  const prevStatus = String(announcement.status ?? "").toUpperCase();
  const explicitNextStatus = parsed.status != null ? String(parsed.status).toUpperCase() : null;

  let publishedAt =
    parsed.publishedAt !== undefined ? normalizePublishedAt(parsed.publishedAt) : announcement.publishedAt;

  let forceDraftFromClearSchedule =
    prevStatus === "SCHEDULED" &&
    parsed.publishedAt !== undefined &&
    publishedAt === null &&
    explicitNextStatus == null;

  if (explicitNextStatus === "DRAFT") {
    publishedAt = null;
  }

  if (parsed.publishedAt !== undefined) {
    const publishingNow = explicitNextStatus === "PUBLISHED";
    if (prevStatus === "SCHEDULED") {
      if (publishedAt != null && !publishingNow) {
        const chk = validatePublishedAtForScheduleUpsert({
          status: explicitNextStatus ?? announcement.status,
          publishedAt,
        });
        if (!chk.ok) return chk;
      }
    } else if (prevStatus === "DRAFT" && publishedAt && publishedAt.getTime() > Date.now()) {
      const chk = validatePublishedAtForScheduleUpsert({
        status: explicitNextStatus ?? "PUBLISHED",
        publishedAt,
      });
      if (!chk.ok) return chk;
    } else if (
      publishedAt &&
      publishedAt.getTime() > Date.now() + getAnnouncementScheduleMinLeadMs() &&
      prevStatus !== "DRAFT" &&
      prevStatus !== "SCHEDULED"
    ) {
      return {
        ok: false,
        status: 400,
        message:
          "Only announcements in SCHEDULED status can set a future publishedAt; cancel schedule or edit a scheduled post",
      };
    }
  }

  if (prevStatus === "PUBLISHED" && explicitNextStatus === "SCHEDULED") {
    return { ok: false, status: 400, message: "Cannot move a published announcement to scheduled" };
  }
  if (
    explicitNextStatus === "PUBLISHED" &&
    publishedAt &&
    publishedAt.getTime() > Date.now() &&
    parsed.publishedAt === undefined
  ) {
    return {
      ok: false,
      status: 400,
      message:
        "Cannot mark as published before the scheduled publish time; reschedule, wait for publish, or cancel schedule",
    };
  }
  if (explicitNextStatus === "PUBLISHED" && parsed.publishedAt !== undefined) {
    const pubMs = publishedAt?.getTime();
    if (pubMs != null && !Number.isNaN(pubMs) && pubMs <= Date.now()) {
      publishedAt = new Date();
    } else if (publishedAt == null) {
      publishedAt = new Date();
    }
  }
  if (
    prevStatus === "SCHEDULED" &&
    publishedAt === null &&
    explicitNextStatus != null &&
    explicitNextStatus !== "DRAFT" &&
    explicitNextStatus !== "ARCHIVED"
  ) {
    return {
      ok: false,
      status: 400,
      message: "Clearing publish time requires status DRAFT (cancel schedule) or ARCHIVED",
    };
  }

  return { ok: true, publishedAt, forceDraftFromClearSchedule, explicitNextStatus, prevStatus };
}

/** @param {object} announcement @param {object} parsed @param {object} schedule */
export function resolveNextStatus(announcement, parsed, schedule) {
  const { publishedAt, forceDraftFromClearSchedule, explicitNextStatus } = schedule;
  let nextStatus = announcement.status;
  if (forceDraftFromClearSchedule) {
    nextStatus = "DRAFT";
  } else if (parsed.status != null) {
    const allowed = new Set(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]);
    const requested = String(parsed.status);
    if (allowed.has(requested)) {
      nextStatus = requested === "SCHEDULED" ? "PUBLISHED" : requested;
    }
  } else if (publishedAt && publishedAt.getTime() > Date.now()) {
    nextStatus = announcement.status === "DRAFT" ? "DRAFT" : "PUBLISHED";
  } else if (announcement.status === "SCHEDULED") {
    nextStatus = "PUBLISHED";
  }
  return nextStatus;
}
