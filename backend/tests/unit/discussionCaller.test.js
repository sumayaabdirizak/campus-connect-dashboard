import { describe, it, expect } from "vitest";
import { getDiscussionCallerUserId } from "../../src/features/discussions/discussionCaller.js";

describe("features/discussions/discussionCaller", () => {
  it("getDiscussionCallerUserId prefers id then sub", () => {
    expect(getDiscussionCallerUserId({ user: { id: 5, sub: "9" } })).toBe(5);
    expect(getDiscussionCallerUserId({ user: { sub: "12" } })).toBe(12);
    expect(getDiscussionCallerUserId({ user: {} })).toBeNull();
    expect(getDiscussionCallerUserId({})).toBeNull();
  });
});
