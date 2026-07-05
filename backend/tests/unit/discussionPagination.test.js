import { describe, it, expect } from "vitest";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
  MAX_DISCUSSION_HISTORY_LIMIT,
} from "../../src/features/discussions/discussionPagination.js";

describe("features/discussions/discussionPagination", () => {
  it("parseDiscussionHistoryLimit clamps invalid and oversized values", () => {
    expect(parseDiscussionHistoryLimit(undefined)).toBe(50);
    expect(parseDiscussionHistoryLimit("0")).toBe(50);
    expect(parseDiscussionHistoryLimit("abc")).toBe(50);
    expect(parseDiscussionHistoryLimit(25)).toBe(25);
    expect(parseDiscussionHistoryLimit(999)).toBe(MAX_DISCUSSION_HISTORY_LIMIT);
  });

  it("encodeDiscussionCursor round-trips through decodeDiscussionCursor", () => {
    const createdAt = new Date("2026-06-14T12:00:00.000Z");
    const cursor = encodeDiscussionCursor(createdAt, 42);
    const decoded = decodeDiscussionCursor(cursor);
    expect(decoded).toEqual({ createdAt, id: 42 });
  });

  it("decodeDiscussionCursor returns null for malformed cursors", () => {
    expect(decodeDiscussionCursor(null)).toBeNull();
    expect(decodeDiscussionCursor("not-valid")).toBeNull();
    expect(decodeDiscussionCursor(encodeDiscussionCursor(new Date("invalid"), 1))).toBeNull();
  });
});
