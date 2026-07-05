import { prisma } from "../../../db/prisma.js";
import { z } from "zod";
import multer from "multer";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  getUnreadCount,
  isPrismaAnnouncementSchemaDriftError,
} from "./announcementVisibility.service.js";
import { findVisibleAnnouncementsBySearch } from "./announcementSearch.service.js";
import { parsePaginationQuery, paginatedPayload } from "../../../utils/pagination.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import {
  toAnnouncementDto,
  announcementDtoPrismaInclude,
  announcementDtoPrismaIncludeLegacy,
  ANNOUNCEMENT_LIKE_EMOJI,
} from "../dto/announcementDto.js";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  markAsRead,
  markAsReadBulk,
  getReadAnnouncementIdSet,
  normalizeTargetRoles,
  visibilityUserFromLoaded,
  writeAnnouncementAudit,
  sortAnnouncementsForList,
} from "./announcementService.js";
import { findAnnouncementRecipientUserIds } from "./announcementRecipients.service.js";
import { sendAnnouncementSmsNotifications, redactPhone } from "./announcementSms.service.js";
import { countOverdueScheduledAnnouncements } from "./announcementJobs.service.js";
import {
  computeAnnouncementAnalytics,
  listAnnouncementAcknowledgements,
  invalidateAnnouncementAnalyticsCache,
} from "./announcementAnalytics.service.js";
import {
  encodeAnnouncementRedirectToken,
  buildTrackedRedirectUrl,
} from "./announcementLinkRedirect.service.js";
import {
  loadAllVisibleDeadlineRows,
  buildCalendarDeadlinesIcs,
  isAnnouncementDeadlineAllDayUtc,
} from "./calendarDeadlines.service.js";
import { announcementLog } from "../announcementLogger.js";
import { attachLikedByCurrentUser } from "./announcementReactions.service.js";
import { csvEscapeCell } from "../../../utils/csv.js";
import {
  trackableLinkBodySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  readBulkSchema,
  previewRecipientsSchema,
} from "../validation/announcementSchemas.js";

export async function handleAnnouncementUnreadCount(req, res) {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const unreadCount = await getUnreadCount(prisma, visibilityUser);

    res.json({ unreadCount });
  } catch (e) {
    announcementLog("error", "announcement.unread_count_failed", { message: e?.message ?? String(e) });
    if (e?.code === "P2032" || isPrismaAnnouncementSchemaDriftError(e)) {
      return res.json({ unreadCount: 0 });
    }
    return res.status(500).json(apiErrorBody(e?.message || "Failed to fetch unread count", null));
  }
}

export async function handleAnnouncementPreviewRecipients(req, res) {
  try {
    const parsed = previewRecipientsSchema.parse({
      targetType: req.query.targetType,
      facultyId: req.query.facultyId || undefined,
      departmentId: req.query.departmentId || undefined,
      batchId: req.query.batchId || undefined,
      sectionId: req.query.sectionId || undefined,
      departmentIds: req.query.departmentIds,
      batchIds: req.query.batchIds,
      sectionIds: req.query.sectionIds,
      targetRoles: req.query.targetRoles,
    });

    const targetRoles = normalizeTargetRoles(
      Array.isArray(parsed.targetRoles)
        ? parsed.targetRoles
        : typeof parsed.targetRoles === "string" && parsed.targetRoles.length > 0
          ? parsed.targetRoles.split(",")
          : ["STUDENT", "TEACHER"],
    );

    // Build the list of (targetType, scopeId) "shards" we need to count.
    // Single-target requests use the canonical FK; multi-target requests
    // expand the union over departmentIds/batchIds/sectionIds.
    const shards = [];
    if (parsed.targetType === "ALL" || parsed.targetType === "FACULTY") {
      shards.push({
        targetType: parsed.targetType,
        facultyId: parsed.facultyId ?? null,
        departmentId: null,
        batchId: null,
        sectionId: null,
      });
    } else if (parsed.targetType === "DEPARTMENT") {
      const ids = parsed.departmentIds.length
        ? parsed.departmentIds
        : parsed.departmentId
          ? [parsed.departmentId]
          : [];
      ids.forEach((id) =>
        shards.push({
          targetType: "DEPARTMENT",
          facultyId: null,
          departmentId: id,
          batchId: null,
          sectionId: null,
        }),
      );
    } else if (parsed.targetType === "BATCH") {
      const ids = parsed.batchIds.length
        ? parsed.batchIds
        : parsed.batchId
          ? [parsed.batchId]
          : [];
      ids.forEach((id) =>
        shards.push({
          targetType: "BATCH",
          facultyId: null,
          departmentId: null,
          batchId: id,
          sectionId: null,
        }),
      );
    } else if (parsed.targetType === "SECTION") {
      const ids = parsed.sectionIds.length
        ? parsed.sectionIds
        : parsed.sectionId
          ? [parsed.sectionId]
          : [];
      ids.forEach((id) =>
        shards.push({
          targetType: "SECTION",
          facultyId: null,
          departmentId: null,
          batchId: null,
          sectionId: id,
        }),
      );
    }

    // Deduplicate user IDs across shards so a student matched by two scopes
    // counts once, not twice.
    const userIdSet = new Set();
    for (const shard of shards) {
      const ids = await findAnnouncementRecipientUserIds(prisma, {
        ...shard,
        targetRoles,
      });
      ids.forEach((id) => userIdSet.add(id));
    }

    const userIds = Array.from(userIdSet);
    const sampleIds = userIds.slice(0, 5);
    const sample = sampleIds.length
      ? await prisma.user.findMany({
          where: { id: { in: sampleIds } },
          select: { id: true, full_name: true },
          take: 5,
        })
      : [];

    res.json({
      count: userIds.length,
      sample: sample.map((u) => ({ id: u.id, name: u.full_name })),
      targetType: parsed.targetType,
      targetRoles,
      shardCount: shards.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    announcementLog("error", "announcement.preview_recipients_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to preview recipients", null));
  }
}

export async function handleAnnouncementMeDataExport(req, res) {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }

    const [reads, acknowledgements, comments, reactions, audits] = await Promise.all([
      prisma.announcementRead.findMany({
        where: { userId },
        select: { announcementId: true, readAt: true, expiresAt: true },
      }),
      prisma.announcementAcknowledgement.findMany({
        where: { userId },
        select: { announcementId: true, acknowledgedAt: true },
      }),
      prisma.announcementComment.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          announcementId: true,
          bodyMarkdown: true,
          parentId: true,
          createdAt: true,
          deletedAt: true,
        },
      }),
      prisma.announcementReaction.findMany({
        where: { userId },
        select: { announcementId: true, emoji: true },
      }),
      prisma.announcementAudit
        .findMany({
          where: { actorId: userId },
          select: {
            id: true,
            announcementId: true,
            action: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1000,
        })
        .catch(() => []),
    ]);

    res.set("Content-Disposition", `attachment; filename="announcements-data-${userId}.json"`);
    res.json({
      generatedAt: new Date().toISOString(),
      userId,
      reads,
      acknowledgements,
      comments,
      reactions,
      audits,
    });
  } catch (error) {
    announcementLog("error", "announcement.data_export_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to export data", null));
  }
}

export async function handleAnnouncementMeVisibility(req, res) {
  try {
    const currentUserId = Number(req.user.sub);
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const deanPrimaryFacultyId =
      loaded.role === "DEAN" && loaded.facultyIds?.length ? loaded.facultyIds[0] : null;
    res.json({ visibilityUser, deanPrimaryFacultyId });
  } catch (error) {
    announcementLog("error", "announcement.me_visibility_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to load visibility scope", null));
  }
}

export async function handleAnnouncementCreate(req, res) {
  try {
    const createdById = Number(req.user.sub);
    const hostBase = `${req.protocol}://${req.get("host")}`;
    const uploadedImageUrls = (req.files || []).map((file) => `${hostBase}/uploads/announcements/${file.filename}`);
    const bodyImageUrls = req.body.imageUrls
      ? Array.isArray(req.body.imageUrls)
        ? req.body.imageUrls
        : [req.body.imageUrls]
      : [];
    const bodyTargetRoles = req.body.targetRoles
      ? Array.isArray(req.body.targetRoles)
        ? req.body.targetRoles
        : [req.body.targetRoles]
      : [];
    const parsed = createAnnouncementSchema.parse({
      ...req.body,
      imageUrls: [...bodyImageUrls, ...uploadedImageUrls],
      targetRoles: normalizeTargetRoles(bodyTargetRoles),
      publishedAt: req.body.publishedAt,
      expiresAt: req.body.expiresAt,
      targets: req.body.targets
        ? typeof req.body.targets === "string"
          ? JSON.parse(req.body.targets)
          : req.body.targets
        : undefined,
    });

    const result = await createAnnouncement(req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    // Persist per-image alt text into AnnouncementAttachment so screen readers
    // can read it back on the lightbox / feed (WCAG 1.1.1 Non-text Content).
    if (result.announcement && uploadedImageUrls.length > 0) {
      const rawAlts = req.body.imageAltTexts;
      const altList = Array.isArray(rawAlts) ? rawAlts : rawAlts != null ? [rawAlts] : [];
      const attachmentRows = (req.files || []).map((file, idx) => ({
        announcementId: result.announcement.id,
        kind: "IMAGE",
        url: `${hostBase}/uploads/announcements/${file.filename}`,
        mimeType: file.mimetype,
        size: BigInt(file.size ?? 0),
        storageKey: file.filename,
        altText: typeof altList[idx] === "string" ? altList[idx].trim() || null : null,
      }));
      if (attachmentRows.length > 0) {
        try {
          await prisma.announcementAttachment.createMany({ data: attachmentRows });
        } catch (err) {
          announcementLog("warn", "announcement.attachment_persist_failed", {
            announcementId: result.announcement.id,
            message: err?.message ?? String(err),
          });
        }
      }
    }

    const [createdWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      createdById,
    );
    if (parsed.notifySms === true && result.announcement) {
      void sendAnnouncementSmsNotifications(prisma, result.announcement, { notifySms: true }).catch((err) => {
        announcementLog("warn", "announcement.sms_async_failed", {
          announcementId: result.announcement.id,
          message: err?.message ?? String(err),
        });
      });
    }
    res.status(201).json(toAnnouncementDto(createdWithLiked ?? result.announcement, createdById));
  } catch (error) {
    announcementLog("error", "announcement.create_failed", { message: error?.message ?? String(error) });
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "Only image files are allowed") {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    res.status(500).json(apiErrorBody("Failed to create announcement", null));
  }
}

export async function handleAnnouncementSearch(req, res) {
  try {
    /** @deprecated Prefer `GET /api/announcements?q=` (and optional filters). */
    res.set("Deprecation", "true");
    res.set("Link", '</api/announcements>; rel="alternate"');
    res.set("Warning", '299 - "Deprecated: use GET /api/announcements?q=<term>"');

    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      return res.json(paginatedPayload({ total: 0, page: 1, pageSize: 20, results: [] }));
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    let announcements;
    try {
      announcements = await findVisibleAnnouncementsBySearch(prisma, {
        visibilityUser,
        q,
        take: limit,
        modernInclude: announcementDtoPrismaInclude,
        legacyInclude: announcementDtoPrismaIncludeLegacy,
      });
    } catch (err) {
      announcementLog("warn", "announcement.search_deprecated_failed", {
        message: err?.message ?? String(err),
      });
      return res.json(paginatedPayload({ total: 0, page: 1, pageSize: limit, results: [] }));
    }

    announcements = await attachLikedByCurrentUser(announcements, currentUserId);
    const readSet = await getReadAnnouncementIdSet(
      currentUserId,
      announcements.map((a) => a.id),
    );
    const withReads = announcements.map((a) => ({
      ...a,
      reads: readSet.has(a.id) ? [{ userId: currentUserId }] : [],
    }));
    const mapped = sortAnnouncementsForList(withReads, currentUserId).map((a) =>
      toAnnouncementDto({ ...a, targetRoles: a.targetRoles ?? [] }, currentUserId),
    );
    res.set("X-Total-Count", String(mapped.length));
    return res.json(paginatedPayload({ total: mapped.length, page: 1, pageSize: limit, results: mapped }));
  } catch (e) {
    announcementLog("error", "announcement.search_deprecated_error", { message: e?.message ?? String(e) });
    return res.json(paginatedPayload({ total: 0, page: 1, pageSize: 20, results: [] }));
  }
}

export async function handleAnnouncementCalendarDeadlinesIcs(req, res) {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const fromRaw = req.query.from != null ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const toRaw = req.query.to != null ? new Date(String(req.query.to)) : new Date(Date.now() + 120 * 86400000);
    if (Number.isNaN(fromRaw.getTime()) || Number.isNaN(toRaw.getTime())) {
      return res.status(400).json({ message: "Invalid from or to date" });
    }

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const rows = await loadAllVisibleDeadlineRows(prisma, loaded, visibilityUser, fromRaw, toRaw);
    const ics = buildCalendarDeadlinesIcs(rows, {
      frontendBaseUrl: process.env.FRONTEND_URL,
    });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="campus-deadlines.ics"');
    return res.status(200).send(ics);
  } catch (error) {
    announcementLog("error", "announcement.calendar_deadlines_ics_failed", {
      message: error?.message ?? String(error),
    });
    return res.status(500).json(apiErrorBody("Failed to build calendar", null));
  }
}

export async function handleAnnouncementCalendarDeadlines(req, res) {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const fromRaw = req.query.from != null ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const toRaw = req.query.to != null ? new Date(String(req.query.to)) : new Date(Date.now() + 60 * 86400000);
    if (Number.isNaN(fromRaw.getTime()) || Number.isNaN(toRaw.getTime())) {
      return res.status(400).json({ message: "Invalid from or to date" });
    }

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const rows = await loadAllVisibleDeadlineRows(prisma, loaded, visibilityUser, fromRaw, toRaw);

    const results = rows.map((r) => ({
      kind: r.kind,
      id: r.id,
      title: r.title,
      deadlineAt: r.deadlineAt ? new Date(r.deadlineAt).toISOString() : null,
      deadlineAllDay: r.deadlineAt ? isAnnouncementDeadlineAllDayUtc(r.deadlineAt) : false,
      courseCode: r.courseCode ?? null,
      courseOfferingId: r.courseOfferingId ?? null,
      targetType: r.targetType ?? null,
      targeting: r.targeting ?? null,
    }));
    res.json({ results });
  } catch (error) {
    announcementLog("error", "announcement.calendar_deadlines_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to load calendar deadlines", null));
  }
}

export async function handleAnnouncementScheduledOverdue(req, res) {
  try {
    const thresholdSecRaw = Number(req.query.thresholdSec);
    const thresholdMs =
      Number.isFinite(thresholdSecRaw) && thresholdSecRaw > 0
        ? Math.trunc(thresholdSecRaw) * 1000
        : 10 * 60 * 1000;
    const count = await countOverdueScheduledAnnouncements(prisma, thresholdMs);
    res.json({
      count,
      thresholdMs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    announcementLog("error", "announcement.scheduled_overdue_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to compute overdue count", null));
  }
}

export async function handleAnnouncementSmsAuditList(req, res) {
  try {
    const { page, pageSize, skip } = parsePaginationQuery(req.query, { defaultPageSize: 20, maxPageSize: 100 });
    const where = {};
    if (req.query.userId != null) where.userId = Number(req.query.userId);
    if (req.query.announcementId != null) where.announcementId = Number(req.query.announcementId);

    const dateFrom = req.query.dateFrom != null ? String(req.query.dateFrom).trim() : "";
    const dateTo = req.query.dateTo != null ? String(req.query.dateTo).trim() : "";
    if (dateFrom || dateTo) {
      const sentAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json(apiErrorBody("Invalid dateFrom", null));
        }
        sentAt.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json(apiErrorBody("Invalid dateTo", null));
        }
        sentAt.lte = d;
      }
      where.sentAt = sentAt;
    }

    const [rows, total] = await Promise.all([
      prisma.smsAuditLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          announcementId: true,
          phoneNumber: true,
          status: true,
          reason: true,
          sentAt: true,
          announcement: { select: { id: true, title: true } },
        },
      }),
      prisma.smsAuditLog.count({ where }),
    ]);

    const results = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      announcementId: r.announcementId,
      announcementTitle: r.announcement?.title ?? null,
      phoneNumber: redactPhone(r.phoneNumber),
      status: r.status,
      reason: r.reason,
      sentAt: r.sentAt.toISOString(),
    }));

    res.json(paginatedPayload({ total, page, pageSize, results }));
  } catch (error) {
    announcementLog("error", "announcement.sms_audit_list_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to load SMS audit log", null));
  }
}

export async function handleAnnouncementAnalytics(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const forceRefresh =
      req.query.refresh === "1" ||
      String(req.query.refresh ?? "").toLowerCase() === "true";
    const data = await computeAnnouncementAnalytics(prisma, id, { forceRefresh });
    if (!data) return res.status(404).json({ message: "Announcement not found" });
    res.json(data);
  } catch (e) {
    announcementLog("error", "announcement.analytics_failed", {
      message: e?.message ?? String(e),
      code: e?.code,
    });
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}

export async function handleAnnouncementAcknowledgementsList(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const filter = String(req.query.filter ?? "all");
    if (String(req.query.format) === "csv") {
      const bulk = await listAnnouncementAcknowledgements(prisma, id, {
        page: 1,
        pageSize: 20000,
        filter,
      });
      if (bulk == null) return res.status(404).json({ message: "Announcement not found" });
      if (bulk.empty) {
        return res.status(400).json({ message: "Acknowledgements not required for this announcement" });
      }
      const header = ["userId", "full_name", "email", "number", "acknowledged", "acknowledgedAt"];
      const lines = [
        header.join(","),
        ...bulk.results.map((r) =>
          [r.userId, r.full_name, r.email, r.number, r.acknowledged, r.acknowledgedAt ?? ""]
            .map(csvEscapeCell)
            .join(","),
        ),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="announcement-${id}-acknowledgements.csv"`);
      return res.status(200).send(lines.join("\n"));
    }

    const { page, pageSize } = parsePaginationQuery(req.query, { defaultPageSize: 50, maxPageSize: 200 });
    const out = await listAnnouncementAcknowledgements(prisma, id, { page, pageSize, filter });
    if (out == null) return res.status(404).json({ message: "Announcement not found" });
    if (out.empty) {
      return res.status(400).json({ message: "Acknowledgements not required for this announcement" });
    }
    res.json(paginatedPayload({ total: out.total, page, pageSize, results: out.results }));
  } catch (e) {
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}

export async function handleAnnouncementTrackableLink(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const parsed = trackableLinkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", issues: parsed.error.issues });
    }
    const token = encodeAnnouncementRedirectToken({
      announcementId: id,
      targetUrl: parsed.data.url,
      userId: Number(req.user.sub),
    });
    if (!token) {
      return res.status(503).json({ message: "Link signing is not configured (ANNOUNCEMENT_LINK_REDIRECT_SECRET or JWT_SECRET)" });
    }
    const hostBase = `${req.protocol}://${req.get("host")}`;
    const base = String(process.env.PUBLIC_API_BASE_URL || hostBase).replace(/\/+$/, "");
    const trackedUrl = buildTrackedRedirectUrl(id, token, base);
    res.json({ trackedUrl });
  } catch (e) {
    res.status(500).json(apiErrorBody(e?.message || "Failed", null));
  }
}

export async function handleAnnouncementAudit(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const role = String(req.user?.role ?? "").toUpperCase();
    if (!["DEAN", "SUPER_ADMIN", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const rows = await prisma.announcementAudit.findMany({
      where: { announcementId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, full_name: true } } },
    });
    res.json({ results: rows });
  } catch {
    res.json({ results: [] });
  }
}

export async function handleAnnouncementAcknowledge(req, res) {
  try {
    const announcementId = Number.parseInt(req.params.id, 10);
    const userId = Number(req.user.sub);
    if (!Number.isFinite(announcementId)) return res.status(400).json({ message: "Invalid id" });

    // Visibility check — only users who can see the announcement may ack it.
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    let visible;
    try {
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        select: { id: true, acknowledgementRequired: true, isActive: true, status: true },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        select: { id: true, acknowledgementRequired: true, isActive: true },
      });
    }
    if (!visible) return res.status(404).json({ message: "Announcement not found" });
    if (visible.isActive === false) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    if (!visible.acknowledgementRequired) {
      return res.status(400).json({ message: "Acknowledgement is not required for this announcement" });
    }

    await prisma.announcementAcknowledgement.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      create: { announcementId, userId },
      update: { acknowledgedAt: new Date() },
    });
    await writeAnnouncementAudit(prisma, userId, announcementId, "ACK", null, {
      acknowledgedAt: new Date().toISOString(),
    });
    invalidateAnnouncementAnalyticsCache(announcementId);
    res.json({ success: true });
  } catch (error) {
    announcementLog("error", "announcement.acknowledge_failed", {
      message: error?.message ?? String(error),
    });
    res.status(500).json(apiErrorBody("Failed to acknowledge", null));
  }
}

export async function handleAnnouncementLike(req, res) {
  try {
    const announcementId = Number.parseInt(req.params.id, 10);
    const userId = Number(req.user.sub);
    if (!Number.isFinite(announcementId)) return res.status(400).json({ message: "Invalid id" });
    const loaded = await loadUserAnnouncementScope(prisma, userId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    let visible;
    try {
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        select: { id: true },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      visible = await prisma.announcement.findFirst({
        where: { AND: [{ id: announcementId }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        select: { id: true },
      });
    }
    if (!visible) return res.status(404).json({ message: "Announcement not found" });

    // Toggle the like. We must NOT drive this with a try/create + catch-P2002,
    // because in PostgreSQL a failed statement inside a transaction aborts the
    // whole transaction (`25P02`), so the follow-up delete/count would error
    // out — that's exactly why "unlike" was returning a 500. Instead, delete
    // first (idempotent: removes 0 rows without throwing), and only insert when
    // nothing existed. `deleteMany.count` tells us which branch we were in, all
    // without ever raising inside the transaction. The frontend `busy` guard
    // serialises a user's own clicks, so the create branch won't race itself.
    const { likes, likedByCurrentUser } = await prisma.$transaction(async (tx) => {
      const removed = await tx.announcementReaction.deleteMany({
        where: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
      });
      let liked;
      if (removed.count > 0) {
        // A like existed and we just cleared it — toggled off.
        liked = false;
      } else {
        await tx.announcementReaction.create({
          data: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
        });
        liked = true;
      }
      const count = await tx.announcementReaction.count({
        where: { announcementId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
      });
      return { likes: count, likedByCurrentUser: liked };
    });
    invalidateAnnouncementAnalyticsCache(announcementId);
    res.json({ likes, likedByCurrentUser });
  } catch (error) {
    announcementLog("error", "announcement.like_toggle_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to toggle like", null));
  }
}

export async function handleAnnouncementReadBulk(req, res) {
  try {
    const userId = Number(req.user.sub);
    const parsed = readBulkSchema.parse(req.body ?? {});
    const result = await markAsReadBulk(userId, parsed.ids);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    res.json({ success: true, marked: result.marked });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    announcementLog("error", "announcement.read_bulk_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to mark announcements as read", null));
  }
}

export async function handleAnnouncementDelete(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const actorId = Number(req.user.sub);
    const result = await deleteAnnouncement(id, req.user);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    await writeAnnouncementAudit(prisma, actorId, id, "DELETE", result.beforeSnap, { archived: true });
    res.json({ success: true, id });
  } catch (error) {
    announcementLog("error", "announcement.delete_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to delete announcement", null));
  }
}

export async function handleAnnouncementGetById(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const currentUserId = Number(req.user.sub);

    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);

    const detailInclude = {
      reads: {
        where: { userId: currentUserId },
        select: { userId: true },
      },
    };
    let announcement;
    try {
      announcement = await prisma.announcement.findFirst({
        where: { AND: [{ id }, buildVisibleAnnouncementsWhere(visibilityUser)] },
        include: {
          ...announcementDtoPrismaInclude,
          ...detailInclude,
        },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      announcement = await prisma.announcement.findFirst({
        where: { AND: [{ id }, buildVisibleAnnouncementsWhereLegacy(visibilityUser)] },
        include: {
          ...announcementDtoPrismaIncludeLegacy,
          ...detailInclude,
        },
      });
    }

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const likedRow = await prisma.announcementReaction.findUnique({
      where: {
        announcementId_userId_emoji: {
          announcementId: id,
          userId: currentUserId,
          emoji: ANNOUNCEMENT_LIKE_EMOJI,
        },
      },
    });
    res.json(
      toAnnouncementDto({ ...announcement, _likedByCurrentUser: Boolean(likedRow) }, currentUserId),
    );
  } catch (error) {
    announcementLog("error", "announcement.detail_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to fetch announcement", null));
  }
}

export async function handleAnnouncementPatch(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }
    const normalizedTargetRoles = req.body?.targetRoles
      ? normalizeTargetRoles(
          Array.isArray(req.body.targetRoles) ? req.body.targetRoles : [req.body.targetRoles],
        )
      : undefined;
    const parsed = updateAnnouncementSchema.parse({
      ...req.body,
      ...(normalizedTargetRoles ? { targetRoles: normalizedTargetRoles } : {}),
      publishedAt: req.body?.publishedAt,
      expiresAt: req.body?.expiresAt,
      deadlineAt: req.body?.deadlineAt,
    });
    const userId = Number(req.user.sub);
    const result = await updateAnnouncement(id, req.user, parsed);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    const [patchedWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      userId,
    );
    return res.json(toAnnouncementDto(patchedWithLiked ?? result.announcement, userId));
  } catch (error) {
    announcementLog("error", "announcement.patch_failed", { message: error?.message ?? String(error) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", issues: error.issues });
    }
    return res.status(500).json(apiErrorBody("Failed to update announcement", null));
  }
}

export async function handleAnnouncementPin(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const userId = Number(req.user.sub);
    const result = await togglePin(id, req.user);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    const [pinnedWithLiked] = await attachLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      userId,
    );
    res.json(toAnnouncementDto(pinnedWithLiked ?? result.announcement, userId));
  } catch (error) {
    announcementLog("error", "announcement.pin_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to toggle pin", null));
  }
}

export async function handleAnnouncementMarkRead(req, res) {
  try {
    const announcementId = Number(req.params.id);
    const userId = Number(req.user.sub);

    if (!Number.isFinite(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const result = await markAsRead(userId, announcementId);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json({ success: true });
  } catch (error) {
    announcementLog("error", "announcement.read_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to mark as read", null));
  }
}
