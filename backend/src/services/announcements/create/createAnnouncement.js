import { prisma } from "../../../db/prisma.js";
import { mergeAnnouncementTargetRows, replaceAnnouncementTargets } from "../announcementTargets.service.js";
import { announcementLog } from "../announcementLogger.js";
import {
  emitAnnouncementRealtimeEvent,
} from "../announcementRealtime.service.js";
import {
  enqueueAnnouncementJobs,
  enqueueAnnouncementJobsStrict,
  AnnouncementSchedulerUnavailableError,
} from "../announcementJobs.service.js";
import { previewAnnouncementSnapshot } from "../dto/announcementDto.js";
import {
  MAX_PINNED_PER_CREATOR,
  announcementEngagementCountInclude,
} from "../announcementService.helpers.js";
import { prepareCreateAnnouncementData } from "./prepareCreateData.js";
import { writeAnnouncementAudit } from "./audit.js";

const announcementInclude = {
  createdBy: { select: { id: true, full_name: true } },
  reads: { select: { userId: true } },
  targets: { select: { scopeType: true, scopeId: true } },
  ...announcementEngagementCountInclude,
};

export async function createAnnouncement(user, parsed) {
  const prep = await prepareCreateAnnouncementData(user, parsed);
  if (!prep.ok) return prep;

  const createdById = Number(user.sub);
  const createdByRole = String(user.role);
  const { extraTargets, ...rowData } = prep.data;

  if (rowData.isPinned) {
    const pinnedByCreator = await prisma.announcement.count({
      where: { createdById, isPinned: true, isActive: true },
    });
    if (pinnedByCreator >= MAX_PINNED_PER_CREATOR) {
      return {
        ok: false,
        status: 400,
        message: `A creator can pin at most ${MAX_PINNED_PER_CREATOR} announcements`,
      };
    }
  }

  let announcement;
  try {
    announcement = await prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: { ...rowData, createdById, createdByRole },
        include: announcementInclude,
      });
      const merged = mergeAnnouncementTargetRows(created, extraTargets);
      await replaceAnnouncementTargets(tx, created.id, merged);
      await writeAnnouncementAudit(tx, createdById, created.id, "CREATE", null, {
        snapshot: previewAnnouncementSnapshot(created),
      });
      const row = await tx.announcement.findUnique({
        where: { id: created.id },
        include: announcementInclude,
      });
      if (row && String(row.status ?? "").toUpperCase() === "SCHEDULED") {
        await enqueueAnnouncementJobsStrict(row);
      }
      return row;
    });
  } catch (err) {
    if (err instanceof AnnouncementSchedulerUnavailableError) {
      announcementLog("error", "announcement.create_scheduler_unavailable", {
        message: err.message,
      });
      return {
        ok: false,
        status: 503,
        message: "Announcement scheduler is unavailable. Please retry shortly.",
      };
    }
    throw err;
  }

  if (!announcement) {
    return { ok: false, status: 500, message: "Failed to create announcement" };
  }
  const createdStatus = String(announcement.status ?? "").toUpperCase();
  if (createdStatus !== "DRAFT") {
    if (createdStatus !== "SCHEDULED") {
      await enqueueAnnouncementJobs(announcement);
    }
    await emitAnnouncementRealtimeEvent(announcement);
  }
  return { ok: true, announcement };
}
