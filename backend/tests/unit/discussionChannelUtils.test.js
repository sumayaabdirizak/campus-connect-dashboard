import { describe, it, expect } from "vitest";
import { slugifyDiscussionChannelName } from "../../src/features/discussions/discussionChannelUtils.js";

describe("features/discussions/discussionChannelUtils", () => {
  it("slugifyDiscussionChannelName normalizes display names", () => {
    expect(slugifyDiscussionChannelName("General Chat")).toBe("general-chat");
    expect(slugifyDiscussionChannelName("  CS-101 Q&A  ")).toBe("cs-101-q-a");
    expect(slugifyDiscussionChannelName("")).toMatch(/^channel-/);
  });
});
