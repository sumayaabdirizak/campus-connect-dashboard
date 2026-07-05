import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getSigningSecret } from "../../utils/signingSecret.js";

export const DISCUSSION_UPLOAD_DIR = "./uploads/discussions";
export const DISCUSSION_ARCHIVE_DIR = "./uploads/discussions-archive";

export const DISCUSSION_FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
  FILE: 25 * 1024 * 1024,
};

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/", "text/"];
const ATTACHMENT_SIGNING_SECRET = getSigningSecret("DISCUSSION_ATTACHMENT_SIGNING_SECRET");
export const DISCUSSION_ATTACHMENT_URL_TTL_SECONDS = Number(
  process.env.DISCUSSION_ATTACHMENT_URL_TTL_SECONDS || 900
);
const VIRUS_SCAN_MODE = String(process.env.DISCUSSION_VIRUS_SCAN_MODE || "off").toLowerCase();

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(DISCUSSION_UPLOAD_DIR)) fs.mkdirSync(DISCUSSION_UPLOAD_DIR, { recursive: true });
    cb(null, DISCUSSION_UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, safeName);
  },
});

export const discussionAttachmentUpload = multer({
  storage,
  limits: { fileSize: DISCUSSION_FILE_SIZE_LIMITS.VIDEO },
  fileFilter: (_, file, cb) => {
    const allowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    if (!allowed) return cb(new Error("Unsupported file type"));
    cb(null, true);
  },
});

export function discussionAttachmentTypeFromMime(mimeType) {
  if (String(mimeType).startsWith("image/")) return "IMAGE";
  if (String(mimeType).startsWith("video/")) return "VIDEO";
  return "FILE";
}

export function signDiscussionAttachmentToken({ attachmentId, userId, expiresAt }) {
  const payload = `${Number(attachmentId)}.${Number(userId)}.${Number(expiresAt)}`;
  const sig = crypto.createHmac("sha256", ATTACHMENT_SIGNING_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

export function parseDiscussionAttachmentToken(token) {
  try {
    const decoded = Buffer.from(String(token || ""), "base64url").toString("utf8");
    const [attachmentIdRaw, userIdRaw, expiresAtRaw, signature] = decoded.split(".");
    const attachmentId = Number(attachmentIdRaw);
    const userId = Number(userIdRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(attachmentId) || !Number.isFinite(userId) || !Number.isFinite(expiresAt)) {
      return null;
    }
    const payload = `${attachmentId}.${userId}.${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", ATTACHMENT_SIGNING_SECRET)
      .update(payload)
      .digest("hex");
    if (expectedSignature !== signature) return null;
    if (Date.now() > expiresAt) return null;
    return { attachmentId, userId, expiresAt };
  } catch {
    return null;
  }
}

export function buildDiscussionAttachmentAccessUrl(
  req,
  attachmentId,
  userId,
  ttlSeconds = DISCUSSION_ATTACHMENT_URL_TTL_SECONDS
) {
  const expiresAt = Date.now() + Math.max(60, ttlSeconds) * 1000;
  const token = signDiscussionAttachmentToken({ attachmentId, userId, expiresAt });
  return `${req.protocol}://${req.get("host")}/api/discussions/attachments/${attachmentId}/download?token=${token}`;
}

export function toDiscussionAttachmentDto(req, attachment, userId) {
  return {
    id: attachment.id,
    groupId: attachment.groupId,
    url: attachment.url,
    accessUrl: buildDiscussionAttachmentAccessUrl(req, attachment.id, userId),
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: Number(attachment.size),
    status: attachment.status,
    createdAt: attachment.createdAt,
    isE2EE: Boolean(attachment.ciphertextHash != null || attachment.keyVersion != null),
  };
}

export async function scanDiscussionUploadedFile(filePath) {
  if (VIRUS_SCAN_MODE === "off") return { clean: true, mode: "off" };
  const simulate = String(process.env.DISCUSSION_VIRUS_SCAN_SIMULATE || "").toLowerCase();
  try {
    if (simulate === "dirty" || simulate === "infected") {
      if (VIRUS_SCAN_MODE === "block") {
        return { clean: false, mode: "block", reason: "simulated_positive" };
      }
      console.warn("[virus-scan] simulated infected file (warn mode):", filePath);
      return { clean: true, mode: "warn", warned: true, reason: "simulated_positive" };
    }
    return { clean: true, mode: VIRUS_SCAN_MODE };
  } catch (error) {
    if (VIRUS_SCAN_MODE === "block") {
      return { clean: false, reason: "virus_scan_failed", error: error?.message || "scan failed" };
    }
    console.warn("Virus scan warning:", error?.message || error);
    return { clean: true, mode: VIRUS_SCAN_MODE, warning: "scan_failed_but_allowed" };
  }
}

/** Adds signed accessUrl + isE2EE on channel message attachment arrays. */
export function enrichDiscussionMessagesAttachments(req, messages, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return messages;
  return messages.map((m) => ({
    ...m,
    attachments: (m.attachments ?? []).map((a) => ({
      ...a,
      size: Number(a.size),
      accessUrl: buildDiscussionAttachmentAccessUrl(req, a.id, uid),
      isE2EE: Boolean(a.ciphertextHash != null || a.keyVersion != null),
    })),
  }));
}
