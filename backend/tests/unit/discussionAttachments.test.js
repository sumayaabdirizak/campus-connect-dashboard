import { describe, it, expect } from "vitest";
import {
  signDiscussionAttachmentToken,
  parseDiscussionAttachmentToken,
  discussionAttachmentTypeFromMime,
} from "../../src/features/discussions/discussionAttachments.js";

describe("features/discussions/discussionAttachments", () => {
  it("discussionAttachmentTypeFromMime maps mime families", () => {
    expect(discussionAttachmentTypeFromMime("image/png")).toBe("IMAGE");
    expect(discussionAttachmentTypeFromMime("video/mp4")).toBe("VIDEO");
    expect(discussionAttachmentTypeFromMime("application/pdf")).toBe("FILE");
  });

  it("signDiscussionAttachmentToken round-trips when not expired", () => {
    const expiresAt = Date.now() + 60_000;
    const token = signDiscussionAttachmentToken({ attachmentId: 7, userId: 3, expiresAt });
    expect(parseDiscussionAttachmentToken(token)).toEqual({
      attachmentId: 7,
      userId: 3,
      expiresAt,
    });
  });

  it("parseDiscussionAttachmentToken rejects expired or tampered tokens", () => {
    const expired = signDiscussionAttachmentToken({
      attachmentId: 1,
      userId: 2,
      expiresAt: Date.now() - 1,
    });
    expect(parseDiscussionAttachmentToken(expired)).toBeNull();
    expect(parseDiscussionAttachmentToken("bad-token")).toBeNull();
  });
});
