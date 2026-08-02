/**
 * Shared UUID resolution + DTO helpers for servers (DiscussionGroup),
 * channel categories (DiscussionChannelCategory), and channels
 * (DiscussionChannel), mirroring `groupDms/helpers.js`'s `toGroupDmDto`
 * pattern: internal integer `id` never leaves the server, `publicId`
 * becomes the wire-format `id`, and FK fields that reference other
 * messaging entities (categoryId, serverId, defaultChannelId) are
 * likewise rewritten to the referenced entity's publicId.
 */
import { prisma } from "../../db/prisma.js";
import { whereFromParam } from "../../services/discussions/publicIdResolution.js";

export async function resolveServerRow(identifier, extraWhere = {}) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.discussionGroup.findFirst({
    where: { ...where, ...extraWhere },
    select: { id: true, publicId: true },
  });
}

export async function resolveChannelRow(identifier, extraWhere = {}) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.discussionChannel.findFirst({
    where: { ...where, ...extraWhere },
    select: { id: true, publicId: true, serverId: true, categoryId: true },
  });
}

export async function resolveCategoryRow(identifier, extraWhere = {}) {
  const where = whereFromParam(identifier);
  if (!where) return null;
  return prisma.discussionChannelCategory.findFirst({
    where: { ...where, ...extraWhere },
    select: { id: true, publicId: true, serverId: true },
  });
}

/** @param {{ id: number; publicId: string; defaultChannel?: { publicId: string } | null }} row */
export function toServerDto(row) {
  if (!row) return row;
  const { id: _internalId, defaultChannelId: _defaultChannelId, defaultChannel, ...rest } = row;
  return {
    ...rest,
    id: row.publicId,
    defaultChannelId: defaultChannel?.publicId ?? null,
  };
}

/** @param {{ id: number; publicId: string; serverId: number }} row */
export function toCategoryDto(row, serverPublicId) {
  if (!row) return row;
  const { id: _internalId, serverId: _serverId, ...rest } = row;
  return { ...rest, id: row.publicId, serverId: serverPublicId };
}

/**
 * @param {{ id: number; publicId: string; serverId: number; categoryId: number | null }} row
 * @param {string} serverPublicId
 * @param {Map<number, string> | null} categoryPublicIdById optional map to avoid N+1 lookups when rendering a list
 */
export function toChannelDto(row, serverPublicId, categoryPublicIdById = null) {
  if (!row) return row;
  const { id: _internalId, serverId: _serverId, categoryId, ...rest } = row;
  const categoryPublicId =
    categoryId == null
      ? null
      : (categoryPublicIdById?.get(categoryId) ?? categoryId);
  return { ...rest, id: row.publicId, serverId: serverPublicId, categoryId: categoryPublicId };
}
