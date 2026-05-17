import { describe, expect, it } from "vitest";
import {
  parseAnnouncementListFilters,
  buildAnnouncementListFilterWhere,
  buildAnnouncementReadReceiptFilterWhere,
} from "../src/features/announcements/services/announcementListFilters.service.js";

describe("parseAnnouncementListFilters", () => {
  it("accepts all-empty query", () => {
    const r = parseAnnouncementListFilters({}, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.q).toBeNull();
      expect(r.value.priority).toBeNull();
      expect(r.value.read).toBeNull();
      expect(r.value.audienceRole).toBeNull();
    }
  });

  it("returns 400 for invalid dateFrom", () => {
    const r = parseAnnouncementListFilters({ dateFrom: "not-a-date" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Invalid dateFrom/i);
  });

  it("returns 400 when dateFrom is after dateTo", () => {
    const r = parseAnnouncementListFilters(
      { dateFrom: "2026-06-01", dateTo: "2026-01-01" },
      { listMode: "main", userId: 1 },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/dateFrom/i);
  });

  it("rejects invalid priority", () => {
    const r = parseAnnouncementListFilters({ priority: "mega" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(false);
  });

  it("does not apply status filter on drafts tab", () => {
    const r = parseAnnouncementListFilters({ status: "PUBLISHED" }, { listMode: "drafts", userId: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBeNull();
  });

  it("applies status on main list", () => {
    const r = parseAnnouncementListFilters({ status: "PUBLISHED" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe("PUBLISHED");
  });

  it("parses read=UNREAD", () => {
    const r = parseAnnouncementListFilters({ read: "unread" }, { listMode: "main", userId: 42 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.read).toBe("UNREAD");
  });

  it("parses role=ALL as no audience filter", () => {
    const r = parseAnnouncementListFilters({ role: "ALL" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.audienceRole).toBeNull();
  });

  it("parses role=LECTURER into TEACHER", () => {
    const r = parseAnnouncementListFilters({ role: "LECTURER" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.audienceRole).toBe("TEACHER");
  });

  it("rejects invalid role filter", () => {
    const r = parseAnnouncementListFilters({ role: "FAKE" }, { listMode: "main", userId: 1 });
    expect(r.ok).toBe(false);
  });
});

describe("buildAnnouncementListFilterWhere", () => {
  it("combines priority and targetType", () => {
    const w = buildAnnouncementListFilterWhere(
      {
        listMode: "main",
        userId: 1,
        q: null,
        priority: "urgent",
        targetType: "DEPARTMENT",
        dateFrom: null,
        dateTo: null,
        status: null,
        read: null,
        audienceRole: null,
      },
      { searchIds: null, useLegacyTextSearch: false },
    );
    expect(w).toMatchObject({
      AND: expect.arrayContaining([{ priority: "urgent" }, { targetType: "DEPARTMENT" }]),
    });
  });

  it("uses id list for full-text ids when not legacy", () => {
    const w = buildAnnouncementListFilterWhere(
      {
        listMode: "main",
        userId: 1,
        q: "hello",
        priority: null,
        targetType: null,
        dateFrom: null,
        dateTo: null,
        status: null,
        read: null,
        audienceRole: null,
      },
      { searchIds: [1, 2, 3], useLegacyTextSearch: false },
    );
    expect(w).toEqual({ id: { in: [1, 2, 3] } });
  });

  it("matches TEACHER or LECTURER in targetRoles when filtering TEACHER", () => {
    const w = buildAnnouncementListFilterWhere(
      {
        listMode: "main",
        userId: 1,
        q: null,
        priority: null,
        targetType: null,
        dateFrom: null,
        dateTo: null,
        status: null,
        read: null,
        audienceRole: "TEACHER",
      },
      { searchIds: null, useLegacyTextSearch: false },
    );
    expect(w).toEqual({
      OR: [{ targetRoles: { has: "TEACHER" } }, { targetRoles: { has: "LECTURER" } }],
    });
  });

  it("joins AnnouncementRead for read=UNREAD with current user id", () => {
    const w = buildAnnouncementListFilterWhere(
      {
        listMode: "main",
        userId: 99,
        q: null,
        priority: null,
        targetType: null,
        dateFrom: null,
        dateTo: null,
        status: null,
        read: "UNREAD",
        audienceRole: null,
      },
      { searchIds: null, useLegacyTextSearch: false },
    );
    expect(w).toEqual({ reads: { none: { userId: 99 } } });
  });
});

describe("buildAnnouncementReadReceiptFilterWhere", () => {
  it("READ uses reads.some scoped to userId", () => {
    expect(buildAnnouncementReadReceiptFilterWhere(7, "READ")).toEqual({
      reads: { some: { userId: 7 } },
    });
  });

  it("UNREAD uses reads.none scoped to userId", () => {
    expect(buildAnnouncementReadReceiptFilterWhere(7, "UNREAD")).toEqual({
      reads: { none: { userId: 7 } },
    });
  });

  it("returns null for non-finite userId", () => {
    expect(buildAnnouncementReadReceiptFilterWhere(Number.NaN, "READ")).toBeNull();
  });

  it("returns null when mode is null", () => {
    expect(buildAnnouncementReadReceiptFilterWhere(1, null)).toBeNull();
  });
});
