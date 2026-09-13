import { describe, it, expect, afterEach } from "vitest";
import {
  buildStorageKey,
  normalizeStorageKey,
  getStorageDriver,
  isObjectStorageEnabled,
} from "../../src/storage/objectStorage.js";

describe("objectStorage helpers", () => {
  const prev = process.env.STORAGE_DRIVER;

  afterEach(() => {
    if (prev == null) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = prev;
  });

  it("buildStorageKey joins prefix and basename", () => {
    expect(buildStorageKey("resources", "a.pdf")).toBe("resources/a.pdf");
    expect(buildStorageKey("/discussions/", "../evil.png")).toBe("discussions/evil.png");
  });

  it("normalizeStorageKey handles storage:// and legacy bare names", () => {
    expect(normalizeStorageKey("storage://resources/x.pdf")).toBe("resources/x.pdf");
    expect(normalizeStorageKey("resources/x.pdf")).toBe("resources/x.pdf");
    expect(normalizeStorageKey("x.pdf", "discussions")).toBe("discussions/x.pdf");
  });

  it("getStorageDriver defaults to local", () => {
    delete process.env.STORAGE_DRIVER;
    expect(getStorageDriver()).toBe("local");
    expect(isObjectStorageEnabled()).toBe(false);
  });

  it("STORAGE_DRIVER=s3|minio enables object storage", () => {
    process.env.STORAGE_DRIVER = "s3";
    expect(getStorageDriver()).toBe("s3");
    expect(isObjectStorageEnabled()).toBe(true);
    process.env.STORAGE_DRIVER = "minio";
    expect(getStorageDriver()).toBe("s3");
  });

  it("keyFromUploadUrl parses /uploads paths and storage://", async () => {
    const { keyFromUploadUrl } = await import("../../src/storage/objectStorage.js");
    expect(keyFromUploadUrl("http://localhost:4000/uploads/chat/a.png")).toBe("chat/a.png");
    expect(keyFromUploadUrl("/uploads/assignments/x.pdf")).toBe("assignments/x.pdf");
    expect(keyFromUploadUrl("storage://resources/y.pdf")).toBe("resources/y.pdf");
    expect(keyFromUploadUrl("bare.pdf", "submissions")).toBe("submissions/bare.pdf");
  });
});
