import { describe, expect, it } from "vitest";
import {
  getAnnouncementScheduleMinLeadMs,
  validatePublishedAtForScheduleUpsert,
} from "../src/features/announcements/services/announcementService.js";

describe("validatePublishedAtForScheduleUpsert", () => {
  it("allows any publishedAt when status is DRAFT", () => {
    const far = new Date(Date.now() + 86400000);
    expect(validatePublishedAtForScheduleUpsert({ status: "DRAFT", publishedAt: far }).ok).toBe(
      true,
    );
  });

  it("allows null publishedAt for non-draft", () => {
    expect(validatePublishedAtForScheduleUpsert({ status: "PUBLISHED", publishedAt: null }).ok).toBe(
      true,
    );
  });

  it("rejects past publishedAt for publish flow", () => {
    const past = new Date(Date.now() - 60000);
    const r = validatePublishedAtForScheduleUpsert({ status: "PUBLISHED", publishedAt: past });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects publishedAt within min lead for SCHEDULED", () => {
    const prev = process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS;
    process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS = "120";
    const soon = new Date(Date.now() + 30_000);
    const r = validatePublishedAtForScheduleUpsert({ status: "SCHEDULED", publishedAt: soon });
    if (prev !== undefined) process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS = prev;
    else delete process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/minute/i);
  });

  it("accepts publishedAt beyond min lead", () => {
    const prev = process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS;
    process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS = "120";
    const okTime = new Date(Date.now() + getAnnouncementScheduleMinLeadMs() + 5000);
    const r = validatePublishedAtForScheduleUpsert({ status: "SCHEDULED", publishedAt: okTime });
    if (prev !== undefined) process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS = prev;
    else delete process.env.ANNOUNCEMENT_SCHEDULE_MIN_LEAD_SECONDS;
    expect(r.ok).toBe(true);
  });
});
