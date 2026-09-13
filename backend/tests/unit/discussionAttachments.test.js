import { describe, it, expect } from "vitest";
import {
  signDiscussionAttachmentToken,
  parseDiscussionAttachmentToken,
  discussionAttachmentTypeFromMime,
  discussionAttachmentTypeFromFile,
  DISCUSSION_ALLOWED_EXTENSIONS,
} from "../../src/services/discussions/discussionAttachments.js";

describe("features/discussions/discussionAttachments", () => {
  it("discussionAttachmentTypeFromMime maps mime families", () => {
    expect(discussionAttachmentTypeFromMime("image/png")).toBe("IMAGE");
    expect(discussionAttachmentTypeFromMime("video/mp4")).toBe("VIDEO");
    expect(discussionAttachmentTypeFromMime("application/pdf")).toBe("FILE");
  });

  it("discussionAttachmentTypeFromFile prefers extension families", () => {
    expect(
      discussionAttachmentTypeFromFile({
        filename: "a.png",
        mimetype: "application/octet-stream",
      })
    ).toBe("IMAGE");
    expect(
      discussionAttachmentTypeFromFile({
        filename: "a.mp4",
        mimetype: "application/octet-stream",
      })
    ).toBe("VIDEO");
  });

  it("rejects dangerous extensions from the allowlist", () => {
    expect(DISCUSSION_ALLOWED_EXTENSIONS.has(".html")).toBe(false);
    expect(DISCUSSION_ALLOWED_EXTENSIONS.has(".js")).toBe(false);
    expect(DISCUSSION_ALLOWED_EXTENSIONS.has(".pdf")).toBe(true);
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
