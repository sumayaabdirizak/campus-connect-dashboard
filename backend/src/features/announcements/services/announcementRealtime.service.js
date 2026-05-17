import { prisma } from "../../../db/prisma.js";
import { getIo } from "../../../socket/hub.js";
import { buildAnnouncementRealtimePayload } from "../dto/announcementDto.js";
import { resolveAnnouncementRoutingTargeting } from "./announcementRouting.service.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";

/**
 * @param {import("socket.io").Server} io
 * @param {string} event
 * @param {unknown} payload
 * @param {Awaited<ReturnType<typeof resolveAnnouncementRoutingTargeting>>} resolvedTargeting
 * @param {import("@prisma/client").Announcement} row
 */
function emitToScopeRooms(io, event, payload, resolvedTargeting, row) {
  switch (row.targetType) {
    case "ALL":
      io.emit(event, payload);
      break;
    case "FACULTY": {
      const facultyId = resolvedTargeting.facultyId ?? row.facultyId;
      if (facultyId != null) io.to(`faculty:${facultyId}`).emit(event, payload);
      break;
    }
    case "DEPARTMENT": {
      const departmentId = resolvedTargeting.departmentId ?? row.departmentId;
      if (departmentId != null) io.to(`department:${departmentId}`).emit(event, payload);
      break;
    }
    case "BATCH": {
      const batchId = resolvedTargeting.batchId ?? row.batchId;
      if (batchId != null) io.to(`batch:${batchId}`).emit(event, payload);
      break;
    }
    case "SECTION": {
      const sectionId = resolvedTargeting.sectionId ?? row.sectionId;
      if (sectionId != null) io.to(`section:${sectionId}`).emit(event, payload);
      break;
    }
    default:
      break;
  }
}

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function emitAnnouncementRealtimeEvent(announcement) {
  const io = getIo();
  if (!io) return;

  const row = await prisma.announcement.findUnique({
    where: { id: announcement.id },
    select: {
      id: true,
      title: true,
      content: true,
      bodyHtml: true,
      priority: true,
      targetType: true,
      status: true,
      expiresAt: true,
      facultyId: true,
      departmentId: true,
      batchId: true,
      sectionId: true,
      imageUrls: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      isPinned: true,
      isActive: true,
      targetRoles: true,
    },
  });
  if (!row) return;
  if (row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) {
    return;
  }
  if (row.status === "DRAFT" || row.status === "ARCHIVED") return;

  const resolvedTargeting = await resolveAnnouncementRoutingTargeting(row);
  const payload = {
    ...buildAnnouncementRealtimePayload(row),
    targeting: {
      facultyId: resolvedTargeting.facultyId ?? row.facultyId ?? null,
      departmentId: resolvedTargeting.departmentId ?? row.departmentId ?? null,
      batchId: resolvedTargeting.batchId ?? row.batchId ?? null,
      sectionId: resolvedTargeting.sectionId ?? row.sectionId ?? null,
    },
  };

  emitToScopeRooms(io, "announcement:new", payload, resolvedTargeting, row);

  try {
    const recipientIds = await findAnnouncementRecipientUserIds(prisma, row);
    for (const uid of recipientIds) {
      io.to(`user:${uid}`).emit("announcement:new", payload);
    }
  } catch {
    // Fanout is best-effort; scope rooms still deliver.
  }
}

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export function emitAnnouncementUpdated(announcement) {
  const io = getIo();
  if (!io) return;
  const payload = {
    id: announcement.id,
    isPinned: announcement.isPinned,
    updatedAt: announcement.updatedAt,
    status: announcement.status,
    expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
  };
  io.emit("announcement:updated", payload);
}

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function emitAnnouncementUpdatedFanout(announcement) {
  const io = getIo();
  if (!io) return;
  const payload = {
    id: announcement.id,
    isPinned: announcement.isPinned,
    updatedAt: announcement.updatedAt,
    status: announcement.status,
    expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
  };
  try {
    const row = await prisma.announcement.findUnique({
      where: { id: announcement.id },
      select: {
        id: true,
        targetType: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
        status: true,
        publishedAt: true,
        createdById: true,
      },
    });
    if (row) {
      const statusU = String(row.status ?? "").toUpperCase();
      if (statusU === "DRAFT" && row.createdById != null) {
        io.to(`user:${row.createdById}`).emit("announcement:updated", payload);
        return;
      }
      const pubMs = row.publishedAt ? new Date(row.publishedAt).getTime() : NaN;
      const isFutureScheduled =
        String(row.status ?? "").toUpperCase() === "SCHEDULED" &&
        Number.isFinite(pubMs) &&
        pubMs > Date.now();
      if (isFutureScheduled && row.createdById != null) {
        io.to(`user:${row.createdById}`).emit("announcement:updated", payload);
        return;
      }
      const resolvedTargeting = await resolveAnnouncementRoutingTargeting(row);
      emitToScopeRooms(io, "announcement:updated", payload, resolvedTargeting, row);
      const recipientIds = await findAnnouncementRecipientUserIds(prisma, row);
      for (const uid of recipientIds) {
        io.to(`user:${uid}`).emit("announcement:updated", payload);
      }
      return;
    }
  } catch {
    /* fall through */
  }
  io.emit("announcement:updated", payload);
}

/**
 * @param {import("@prisma/client").Announcement} announcement
 */
export async function emitAnnouncementExpired(announcement) {
  const io = getIo();
  if (!io) return;
  const payload = { id: announcement.id, status: announcement.status };
  try {
    const resolvedTargeting = await resolveAnnouncementRoutingTargeting(announcement);
    emitToScopeRooms(io, "announcement:expired", payload, resolvedTargeting, announcement);
    const recipientIds = await findAnnouncementRecipientUserIds(prisma, announcement);
    for (const uid of recipientIds) {
      io.to(`user:${uid}`).emit("announcement:expired", payload);
    }
  } catch {
    io.emit("announcement:expired", payload);
  }
}
