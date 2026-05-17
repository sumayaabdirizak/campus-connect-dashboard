import { describe, expect, it } from "vitest";
import {
  encodeAnnouncementCursor,
  buildAnnouncementCursorWhere,
} from "../src/features/announcements/dto/announcementDto.js";

/**
 * Regression coverage for H6 — pagination cursor must encode `(isPinned,
 * createdAt, id)` so feeds remain stable when two announcements share the
 * same millisecond-precision createdAt. Without an `id` tiebreak in both
 * the cursor and the WHERE clause, page boundaries can either drop rows
 * or repeat them depending on the natural row order Postgres returns.
 *
 * The list endpoint orders by:
 *   [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }]
 * so a cursor pointing at row X must yield WHERE-rows strictly *after* X
 * in that order.
 */
describe("announcement cursor pagination", () => {
  it("round-trips isPinned / createdAt / id through encode→decode", () => {
    const row = {
      id: 42,
      isPinned: true,
      createdAt: new Date("2026-05-15T07:00:00.123Z"),
    };
    const cursor = encodeAnnouncementCursor(row);
    expect(typeof cursor).toBe("string");
    expect(cursor.length).toBeGreaterThan(0);

    const where = buildAnnouncementCursorWhere(cursor);
    // Must reference all three sort fields.
    const serialized = JSON.stringify(where);
    expect(serialized).toMatch(/isPinned/);
    expect(serialized).toMatch(/createdAt/);
    expect(serialized).toMatch(/"id"/);
  });

  it("returns {} for missing/garbage cursors (does not throw)", () => {
    expect(buildAnnouncementCursorWhere(undefined)).toEqual({});
    expect(buildAnnouncementCursorWhere("")).toEqual({});
    expect(buildAnnouncementCursorWhere("not-base64")).toEqual({});
    // Valid base64 but not JSON
    const junk = Buffer.from("hello world", "utf8").toString("base64url");
    expect(buildAnnouncementCursorWhere(junk)).toEqual({});
  });

  it("uses id-tiebreak when two rows share the same createdAt millisecond", () => {
    // Same createdAt, different ids — the cursor for row#100 must exclude
    // itself and include row#99 (lower id, same timestamp) only via the
    // id-tiebreak branch, since createdAt < t alone would miss it.
    const sameTs = new Date("2026-05-15T07:00:00.000Z");
    const cursor = encodeAnnouncementCursor({ id: 100, isPinned: false, createdAt: sameTs });
    const where = buildAnnouncementCursorWhere(cursor);

    // The OR must contain the tiebreak branch: createdAt = t AND id < 100.
    // We do a structural sanity check rather than a full Prisma-AST match.
    const ser = JSON.stringify(where);
    expect(ser).toMatch(/"lt":100/); // id strictly less than cursor id
    // The exact ISO timestamp must appear for the createdAt-equality branch.
    expect(ser.includes(sameTs.toISOString())).toBe(true);
  });

  it("pinned cursor includes all unpinned rows via the OR fanout", () => {
    // When the cursor row is pinned, the next-page WHERE must also include
    // every unpinned row (since the global sort has all pinned before all
    // unpinned). Without this, pagination from the last pinned row drops
    // the entire unpinned tail.
    const cursor = encodeAnnouncementCursor({
      id: 1,
      isPinned: true,
      createdAt: new Date("2026-05-15T07:00:00.000Z"),
    });
    const where = buildAnnouncementCursorWhere(cursor);
    const ser = JSON.stringify(where);
    // The unpinned fanout branch lives at the top-level OR.
    expect(ser).toMatch(/"isPinned":false/);
  });

  it("unpinned cursor must NOT spill into pinned rows", () => {
    // Inverse of the previous case: an unpinned cursor should stay within
    // the unpinned segment (pinned rows come earlier in the sort, so they
    // were already shown on previous pages).
    const cursor = encodeAnnouncementCursor({
      id: 5,
      isPinned: false,
      createdAt: new Date("2026-05-15T07:00:00.000Z"),
    });
    const where = buildAnnouncementCursorWhere(cursor);
    const ser = JSON.stringify(where);
    // Should not contain a free-floating `"isPinned":true` clause at the
    // top-level OR (the only `isPinned` occurrence should be the equality
    // inside the AND branch).
    const matches = ser.match(/"isPinned":true/g);
    expect(matches).toBeNull();
  });
});
