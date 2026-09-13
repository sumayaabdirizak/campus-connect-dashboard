import { prisma } from "../../../db/prisma.js";
import { mergeAnnouncementTargetRows, replaceAnnouncementTargets } from "../announcementTargets.service.js";
import { announcementLog } from "../announcementLogger.js";
import {
  emitAnnouncementRealtimeEvent,
  emitAnnouncementUpdatedFanout,
} from "../announcementRealtime.service.js";
import {
  enqueueAnnouncementJobs,
  enqueueAnnouncementJobsStrict,
  AnnouncementSchedulerUnavailableError,
} from "../announcementJobs.service.js";
import { previewAnnouncementSnapshot } from "../dto/announcementDto.js";
import { announcementEngagementCountInclude } from "../announcementService.helpers.js";
import { writeAnnouncementAudit, resolveAnnouncementUpdateAuditAction } from "../create/audit.js";
import { loadAnnouncementForUpdate } from "./accessChecks.js";
import { resolveUpdateScheduleFields } from "./scheduleFields.js";
import { buildAnnouncementUpdateData } from "./buildUpdateData.js";

const updateInclude = {
  createdBy: { select: { id: true, full_name: true, role: { select: { name: true } } } },
  reads: { where: { userId: 0 }, select: { userId: true } },
  targets: { select: { scopeType: true, scopeId: true } },
  ...announcementEngagementCountInclude,
};

export async function updateAnnouncement(announcementId, jwtUser, parsed) {
  const access = await loadAnnouncementForUpdate(announcementId, jwtUser);
  if (!access.ok) return access;

  const { userId, announcement, beforeSnap } = access;
  const schedule = resolveUpdateScheduleFields(announcement, parsed);
  if (!schedule.ok) return schedule;

  const built = await buildAnnouncementUpdateData(
    { announcement, announcementId, role: access.role, loaded: access.loaded },
    parsed,
    schedule,
  );
  if (!built.ok) return built;

  if (parsed.deadlineAt !== undefined) {
    await prisma.calendarReminderJob.deleteMany({ where: { announcementId } });
  }

  const include = {
    ...updateInclude,
    reads: { where: { userId }, select: { userId: true } },
  };

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.announcement.update({
        where: { id: announcementId },
        data: built.data,
        include,
      });
      const targetsToWrite =
        built.extraTargets != null
          ? mergeAnnouncementTargetRows(row, built.extraTargets)
          : mergeAnnouncementTargetRows(row, []);
      await replaceAnnouncementTargets(tx, announcementId, targetsToWrite);
      const auditAction = resolveAnnouncementUpdateAuditAction(built.prevStatus, String(row.status ?? ""), {
        forceDraftFromClearSchedule: built.forceDraftFromClearSchedule,
      });
      await writeAnnouncementAudit(tx, userId, announcementId, auditAction, beforeSnap, {
        snapshot: previewAnnouncementSnapshot(row),
      });
      const finalRow = await tx.announcement.findUnique({ where: { id: announcementId }, include });
      if (finalRow && String(finalRow.status ?? "").toUpperCase() === "SCHEDULED") {
        await enqueueAnnouncementJobsStrict(finalRow);
      }
      return finalRow;
    });
  } catch (err) {
    if (err instanceof AnnouncementSchedulerUnavailableError) {
      announcementLog("error", "announcement.update_scheduler_unavailable", {
        announcementId,
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

  if (updated) {
    const updatedStatus = String(updated.status ?? "").toUpperCase();
    if (updatedStatus !== "DRAFT" && updatedStatus !== "SCHEDULED") {
      await enqueueAnnouncementJobs(updated);
    }
    if (built.prevStatus === "DRAFT" && updatedStatus !== "DRAFT") {
      await emitAnnouncementRealtimeEvent(updated);
    }
    await emitAnnouncementUpdatedFanout(updated);
  }
  return { ok: true, announcement: updated };
}
