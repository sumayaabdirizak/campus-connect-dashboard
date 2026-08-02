/**
 * Shared UUID resolution + DTO helpers for DiscussionMessage and
 * DiscussionAttachment, mirroring `serverShared.js`: internal integer `id`
 * never leaves the server, `publicId` becomes the wire-format `id`, and FK
 * fields referencing another message (parentMessageId, replyToMessageId)
 * are rewritten to that message's publicId too.
 */
import { prisma } from "../../db/prisma.js";
import { whereFromParam } from "../../features/discussions/publicIdResolution.js";

export async function resolveMessageRow(identifier, extraWhere = {}) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.discussionMessage.findFirst({
    where: { ...where, ...extraWhere },
    select: { id: true, publicId: true },
  });
}

export async function resolveAttachmentRow(identifier, extraWhere = {}) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.discussionAttachment.findFirst({
    where: { ...where, ...extraWhere },
    select: { id: true, publicId: true },
  });
}

/**
 * Resolve a list of client-supplied attachment identifiers (publicId or
 * legacy numeric id) to their internal integer ids. Silently drops any that
 * don't resolve — callers already validate the resulting count matches.
 */
export async function resolveAttachmentIds(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return [];
  const wheres = identifiers.map(whereFromParam).filter(Boolean);
  if (wheres.length === 0) return [];
  const rows = await prisma.discussionAttachment.findMany({
    where: { OR: wheres },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Build an int-id -> publicId map for a batch of messages, used to rewrite
 * `parentMessageId`/`replyToMessageId` FK fields without N+1 queries. Pass
 * every message row (and any already-fetched related rows like `replyTo`)
 * that might be a parent/reply target — anything not in `rows` triggers one
 * extra lookup for the missing ids.
 */
export async function buildMessagePublicIdMap(rows, extraIds = []) {
  const ids = new Set();
  for (const r of rows) {
    if (r?.id != null) ids.add(r.id);
    if (r?.parentMessageId != null) ids.add(r.parentMessageId);
    if (r?.replyToMessageId != null) ids.add(r.replyToMessageId);
  }
  for (const id of extraIds) if (id != null) ids.add(id);
  const known = new Map();
  const missing = [];
  for (const r of rows) {
    if (r?.id != null && r.publicId) known.set(r.id, r.publicId);
    if (r?.replyTo?.id != null && r.replyTo.publicId) known.set(r.replyTo.id, r.replyTo.publicId);
  }
  for (const id of ids) {
    if (!known.has(id)) missing.push(id);
  }
  if (missing.length > 0) {
    const found = await prisma.discussionMessage.findMany({
      where: { id: { in: missing } },
      select: { id: true, publicId: true },
    });
    for (const f of found) known.set(f.id, f.publicId);
  }
  return known;
}

/**
 * @param {object} row raw DiscussionMessage row (must include publicId)
 * @param {Map<number, string>} publicIdById int id -> publicId map covering
 *   this row's own id plus any parentMessageId/replyToMessageId it carries
 */
export function toMessageDto(row, publicIdById) {
  if (!row) return row;
  const { id: _internalId, parentMessageId, replyToMessageId, replyTo, ...rest } = row;
  return {
    ...rest,
    id: row.publicId,
    parentMessageId: parentMessageId != null ? (publicIdById.get(parentMessageId) ?? null) : null,
    replyToMessageId: replyToMessageId != null ? (publicIdById.get(replyToMessageId) ?? null) : null,
    ...(replyTo !== undefined
      ? {
          replyTo: replyTo
            ? { ...replyTo, id: replyTo.publicId ?? publicIdById.get(replyTo.id) ?? null }
            : replyTo,
        }
      : {}),
  };
}

export function toAttachmentIdDto(row) {
  if (!row) return row;
  const { id: _internalId, ...rest } = row;
  return { ...rest, id: row.publicId };
}
