import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import Joi from "joi";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateQuery } from "../../middleware/validateRequest.js";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  getUnreadCount,
  isPrismaAnnouncementSchemaDriftError,
} from "./services/announcementVisibility.service.js";
import {
  parseAnnouncementListFilters,
  resolveAnnouncementQuerySearchIds,
  buildAnnouncementListFilterWhere,
} from "./services/announcementListFilters.service.js";
import { findVisibleAnnouncementsBySearch } from "./services/announcementSearch.service.js";
import { parsePaginationQuery, paginatedPayload, parseCursorPagination } from "../../utils/pagination.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import {
  toAnnouncementDto,
  buildAnnouncementCursorWhere,
  encodeAnnouncementCursor,
  announcementDtoPrismaInclude,
  announcementDtoPrismaIncludeLegacy,
  ANNOUNCEMENT_LIKE_EMOJI,
  previewAnnouncementSnapshot,
} from "./dto/announcementDto.js";
import {
  CREATE_ANNOUNCEMENT_ROLES,
  createAnnouncement,
  updateAnnouncement,
  togglePin,
  markAsRead,
  markAsReadBulk,
  getReadAnnouncementIdSet,
  normalizeTargetRoles,
  normalizePublishedAt,
  validatePublishedAtForScheduleUpsert,
  sortAnnouncementsForList,
  visibilityUserFromLoaded,
  writeAnnouncementAudit,
} from "./services/announcementService.js";
import { findAnnouncementRecipientUserIds } from "./services/announcementRecipients.service.js";
import { sendAnnouncementSmsNotifications, redactPhone } from "./services/announcementSms.service.js";
import { countOverdueScheduledAnnouncements } from "./services/announcementJobs.service.js";
import {
  computeAnnouncementAnalytics,
  listAnnouncementAcknowledgements,
  invalidateAnnouncementAnalyticsCache,
} from "./services/announcementAnalytics.service.js";
import {
  readIdempotentResponse,
  writeIdempotentResponse,
} from "./services/announcementIdempotency.service.js";
import {
  encodeAnnouncementRedirectToken,
  buildTrackedRedirectUrl,
} from "./services/announcementLinkRedirect.service.js";
import {
  loadAllVisibleDeadlineRows,
  buildCalendarDeadlinesIcs,
  isAnnouncementDeadlineAllDayUtc,
} from "./services/calendarDeadlines.service.js";
import { announcementLog } from "./announcementLogger.js";

const router = express.Router();

const smsAuditListQuerySchema = Joi.object({
  userId: Joi.number().integer().positive().optional(),
  announcementId: Joi.number().integer().positive().optional(),
  dateFrom: Joi.string().trim().max(40).optional(),
  dateTo: Joi.string().trim().max(40).optional(),
}).unknown(true);

const ackListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(500).optional(),
  filter: Joi.string().valid("all", "acked", "pending").optional(),
  format: Joi.string().valid("json", "csv").optional(),
}).unknown(true);

const trackableLinkBodySchema = z.object({
  url: z.string().url().max(4000),
});

/**
 * @param {Array<Record<string, unknown> & { id: number }>} rows
 * @param {number} userId
 */
async function withLikedByCurrentUser(rows, userId) {
  const list = rows ?? [];
  const ids = list.map((a) => Number(a.id)).filter((n) => Number.isFinite(n));
  if (!ids.length) return list.map((a) => ({ ...a, _likedByCurrentUser: false }));
  const likedRows = await prisma.announcementReaction.findMany({
    where: { announcementId: { in: ids }, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
    select: { announcementId: true },
  });
  const likedSet = new Set(likedRows.map((r) => r.announcementId));
  return list.map((a) => ({ ...a, _likedByCurrentUser: likedSet.has(Number(a.id)) }));
}

const announcementsCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANNOUNCEMENTS_CREATE_RATE_LIMIT_PER_MIN ?? 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", code: "ANNOUNCEMENTS_RATE_LIMIT" },
});

/**
 * Per-user rate limit for POST /read-bulk. Without it a misbehaving (or
 * malicious) client can hammer the endpoint to inflate read analytics and
 * bloat AnnouncementRead. Keyed on req.user.sub so one tenant's traffic
 * doesn't penalize others sharing an IP.
 */
const readBulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ANNOUNCEMENTS_READ_BULK_RATE_LIMIT_PER_MIN ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const sub = req.user?.sub;
    // Authenticated path always keys on the user — IP is only a fallback for
    // edge cases where auth middleware didn't populate req.user. Use the
    // library's helper so IPv6 collapses to a /64 subnet (per express-rate-
    // limit's ERR_ERL_KEY_GEN_IPV6 guidance).
    return sub != null ? `u:${sub}` : `ip:${ipKeyGenerator(req, res)}`;
  },
  message: { error: "Too many requests", code: "ANNOUNCEMENTS_READ_BULK_RATE_LIMIT" },
});

/** @type {import("express").RequestHandler} */
async function idempotencyAnnouncementsPost(req, res, next) {
  try {
    const key = req.get("Idempotency-Key");
    if (!key || key.length > 128) return next();
    const prev = await readIdempotentResponse(key);
    if (prev) {
      res.set("Idempotency-Replayed", "true");
      return res.status(prev.status).json(prev.body);
    }
    const origJson = res.json.bind(res);
    res.json = (body) => {
      // Fire-and-forget store; failure is logged inside the helper.
      writeIdempotentResponse(key, res.statusCode, body).catch(() => {});
      return origJson(body);
    };
    next();
  } catch (err) {
    announcementLog("warn", "announcement.idempotency_middleware_failed", {
      message: err?.message ?? String(err),
    });
    next();
  }
}
const UPLOAD_DIR = "./uploads/announcements";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const targetRowSchema = z.object({
  scopeType: z.enum(["FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
  scopeId: z.coerce.number().int().positive(),
});

const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, "title is required"),
    content: z.string().trim().min(1, "content is required"),
    priority: z.enum(["normal", "important", "urgent"]).default("normal"),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    imageUrls: z.array(z.string().trim().min(1)).max(20).default([]),
    targetRoles: z.array(z.string().trim().min(1)).max(50).optional().default([]),
    publishedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    deadlineAt: z.union([z.string(), z.null()]).optional(),
    notifySms: z.coerce.boolean().optional(),
    isPinned: z.coerce.boolean().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional(),
    targets: z.array(targetRowSchema).max(50).optional(),
    bodyMarkdown: z.string().optional(),
    bodyHtml: z.string().optional(),
    acknowledgementRequired: z.coerce.boolean().optional(),
    commentsEnabled: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "FACULTY" && !data.facultyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facultyId"],
        message: "facultyId is required for FACULTY targetType",
      });
    }
    if (data.targetType === "DEPARTMENT" && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "departmentId is required for DEPARTMENT targetType",
      });
    }
    if (data.targetType === "BATCH" && !data.batchId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is required for BATCH targetType" });
    }
    if (data.targetType === "SECTION" && !data.sectionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sectionId"],
        message: "sectionId is required for SECTION targetType",
      });
    }
    if (data.targetType !== "FACULTY" && data.facultyId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facultyId"],
        message: "facultyId is only allowed for FACULTY targetType",
      });
    }
    if (data.targetType !== "DEPARTMENT" && data.departmentId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departmentId"],
        message: "departmentId is only allowed for DEPARTMENT targetType",
      });
    }
    if (data.targetType !== "BATCH" && data.batchId != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["batchId"], message: "batchId is only allowed for BATCH targetType" });
    }
    if (data.targetType !== "SECTION" && data.sectionId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sectionId"],
        message: "sectionId is only allowed for SECTION targetType",
      });
    }
    const pub = normalizePublishedAt(data.publishedAt);
    if (pub) {
      const chk = validatePublishedAtForScheduleUpsert({ status: data.status, publishedAt: pub });
      if (!chk.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["publishedAt"],
          message: chk.message,
        });
      }
    }
  });

const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    priority: z.enum(["normal", "important", "urgent"]).optional(),
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]).optional(),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    targetRoles: z.array(z.string().trim().min(1)).min(1, "At least one target role is required").optional(),
    publishedAt: z.union([z.string(), z.null()]).optional(),
    expiresAt: z.union([z.string(), z.null()]).optional(),
    deadlineAt: z.union([z.string(), z.null()]).optional(),
    isPinned: z.coerce.boolean().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]).optional(),
    targets: z.array(targetRowSchema).max(50).optional(),
    bodyMarkdown: z.string().optional(),
    bodyHtml: z.string().optional(),
    acknowledgementRequired: z.coerce.boolean().optional(),
    commentsEnabled: z.coerce.boolean().optional(),
  })
  .strict();

const readBulkSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
});

router.get("/", auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user?.sub);
    if (!Number.isFinite(currentUserId)) {
      return res.status(401).json({ message: "Invalid user context" });
    }
    const loaded = await loadUserAnnouncementScope(prisma, currentUserId);
    if (!loaded) return res.status(404).json({ message: "User not found" });
    const visibilityUser = visibilityUserFromLoaded(loaded);
    const primaryFacultyId = visibilityUser.facultyIds?.[0] ?? null;

    announcementLog("info", "announcement.list_context", {
      userId: currentUserId,
      role: visibilityUser?.role ?? null,
      facultyId: primaryFacultyId,
    });

    if (visibilityUser.role === "DEAN" && !primaryFacultyId) {
      return res.status(400).json({ message: "Dean profile is missing faculty scope" });
    }

    const orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }];

    const statusParam = String(req.query.status ?? "").toUpperCase();
    const draftsOnly = statusParam === "DRAFT";
    const scheduledOnly =
      !draftsOnly &&
      (req.query.scheduled === "1" ||
        String(req.query.scheduled ?? "").toLowerCase() === "true" ||
        statusParam === "SCHEDULED");
    const roleUpper = String(visibilityUser.role ?? "").toUpperCase();
    if (scheduledOnly && !["DEAN", "SUPER_ADMIN"].includes(roleUpper)) {
      return res.status(403).json({ message: "Only announcement publishers can list scheduled posts" });
    }
    if (draftsOnly && !CREATE_ANNOUNCEMENT_ROLES.has(roleUpper)) {
      return res.status(403).json({ message: "Only announcement publishers can list drafts" });
    }

    const listMode = draftsOnly ? "drafts" : scheduledOnly ? "scheduled" : "main";
    const parsedListFilters = parseAnnouncementListFilters(req.query, {
      listMode,
      userId: currentUserId,
    });
    if (!parsedListFilters.ok) {
      return res.status(400).json({ message: parsedListFilters.message });
    }

    const scheduledOrderBy = [{ publishedAt: "asc" }, { id: "desc" }];
    const useCursor =
      !scheduledOnly &&
      !draftsOnly &&
      typeof req.query.cursor === "string" &&
      req.query.cursor.trim().length > 0;
    const { cursor, limit } = parseCursorPagination(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    let announcements;
    let nextCursor = null;
    let total;

    const now = new Date();

    const searchRes = await resolveAnnouncementQuerySearchIds(prisma, parsedListFilters.value.q);
    const listFilterWhere = buildAnnouncementListFilterWhere(parsedListFilters.value, {
      searchIds: searchRes.legacy ? null : searchRes.ids,
      useLegacyTextSearch: searchRes.legacy,
    });

    const withListFilters = (baseWhere) =>
      listFilterWhere ? { AND: [baseWhere, listFilterWhere] } : baseWhere;

    const loadPage = async (whereBuilder, include, listOrderBy) => {
      const baseWhere = withListFilters(whereBuilder(visibilityUser));
      if (useCursor) {
        const where = {
          AND: [baseWhere, buildAnnouncementCursorWhere(cursor)],
        };
        const take = limit + 1;
        return prisma.announcement.findMany({
          where,
          orderBy: listOrderBy,
          take,
          include,
        });
      }
      total = await prisma.announcement.count({ where: baseWhere });
      return prisma.announcement.findMany({
        where: baseWhere,
        orderBy: listOrderBy,
        skip,
        take: pageSize,
        include,
      });
    };

    const scheduledWhere = () => ({
      AND: [
        { isActive: true },
        { status: "SCHEDULED" },
        { publishedAt: { gt: now } },
        { createdById: currentUserId },
      ],
    });

    const draftWhere = () => ({
      AND: [{ isActive: true }, { status: "DRAFT" }, { createdById: currentUserId }],
    });

    let listUsesLegacyWhere = false;
    try {
      if (draftsOnly) {
        announcements = await loadPage(
          (_vu) => draftWhere(),
          announcementDtoPrismaInclude,
          orderBy,
        );
      } else if (scheduledOnly) {
        announcements = await loadPage(
          (_vu) => scheduledWhere(),
          announcementDtoPrismaInclude,
          scheduledOrderBy,
        );
      } else {
        announcements = await loadPage(
          buildVisibleAnnouncementsWhere,
          announcementDtoPrismaInclude,
          orderBy,
        );
      }
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      if (draftsOnly) {
        announcements = await loadPage(
          (_vu) => draftWhere(),
          announcementDtoPrismaIncludeLegacy,
          orderBy,
        );
      } else if (scheduledOnly) {
        announcements = await loadPage(
          (_vu) => scheduledWhere(),
          announcementDtoPrismaIncludeLegacy,
          scheduledOrderBy,
        );
      } else {
        listUsesLegacyWhere = true;
        announcements = await loadPage(
          buildVisibleAnnouncementsWhereLegacy,
          announcementDtoPrismaIncludeLegacy,
          orderBy,
        );
      }
    }

    if (useCursor) {
      const baseCountWhere = draftsOnly
        ? draftWhere()
        : scheduledOnly
          ? scheduledWhere()
          : listUsesLegacyWhere
            ? buildVisibleAnnouncementsWhereLegacy(visibilityUser)
            : buildVisibleAnnouncementsWhere(visibilityUser);
      const whereForCount = listFilterWhere ? { AND: [baseCountWhere, listFilterWhere] } : baseCountWhere;
      let fullTotal;
      try {
        fullTotal = await prisma.announcement.count({ where: whereForCount });
      } catch (countErr) {
        if (!isPrismaAnnouncementSchemaDriftError(countErr)) throw countErr;
        const fb = draftsOnly
          ? draftWhere()
          : scheduledOnly
            ? scheduledWhere()
            : buildVisibleAnnouncementsWhereLegacy(visibilityUser);
        const w2 = listFilterWhere ? { AND: [fb, listFilterWhere] } : fb;
        fullTotal = await prisma.announcement.count({ where: w2 });
      }
      total = fullTotal;
    }

    announcements = await withLikedByCurrentUser(announcements, currentUserId);

    if (useCursor) {
      const hasMore = announcements.length > limit;
      const pageRows = hasMore ? announcements.slice(0, limit) : announcements;
      if (hasMore && pageRows.length) {
        nextCursor = encodeAnnouncementCursor(pageRows[pageRows.length - 1]);
      }
      announcements = pageRows;
    }

    const announcementIds = (announcements ?? [])
      .map((a) => Number(a?.id))
      .filter((id) => Number.isFinite(id));
    const readAnnouncementIdSet = await getReadAnnouncementIdSet(currentUserId, announcementIds);
    const announcementsWithReads = (announcements ?? []).map((a) => ({
      ...a,
      reads: readAnnouncementIdSet.has(Number(a.id)) ? [{ userId: currentUserId }] : [],
    }));

    const sorted =
      scheduledOnly || draftsOnly
        ? announcementsWithReads
        : sortAnnouncementsForList(announcementsWithReads, currentUserId);
    const mapped = sorted.map((a) =>
      toAnnouncementDto(
        {
          ...a,
          targetRoles: Array.isArray(a.targetRoles) ? a.targetRoles : [],
        },
        currentUserId,
      ),
    );

    if (typeof total === "number" && Number.isFinite(total)) {
      res.set("X-Total-Count", String(total));
    }

    if (useCursor) {
      return res.json(
        paginatedPayload({
          total,
          page: 1,
          pageSize: limit,
          results: mapped,
          nextCursor,
        }),
      );
    }

    return res.json(
      paginatedPayload({
        total,
        page,
        pageSize,
        results: mapped,
      }),
    );
  } catch (e) {
    announcementLog("error", "announcement.list_failed", { message: e?.message ?? String(e) });
    const { page, pageSize } = parsePaginationQuery(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });
    if (e?.code === "P2032") {
      return res.json(paginatedPayload({ total: 0, page, pageSize, results: [] }));
    }
    return res.status(500).json(apiErrorBody(e?.message || "Failed to fetch announcements", null));
  }
});

router.get("/unread-count", auth, async (req, res) => {
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
});

const csvIntList = z
  .union([z.string(), z.array(z.union([z.string(), z.number()]))])
  .optional()
  .transform((val) => {
    if (val == null) return [];
    const arr = Array.isArray(val) ? val : String(val).split(",");
    return arr
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  });

const previewRecipientsSchema = z
  .object({
    targetType: z.enum(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]),
    facultyId: z.coerce.number().int().positive().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    batchId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    /** Multi-target — when present, the union of these scopes drives the count. */
    departmentIds: csvIntList,
    batchIds: csvIntList,
    sectionIds: csvIntList,
    targetRoles: z
      .union([z.string(), z.array(z.string().trim().min(1))])
      .optional(),
  })
  .strict();

/**
 * Audience preview — returns reach count + a small sample so publishers can
 * confirm "who will see this?" before posting. Powers EAA "understandable"
 * criterion + plain-language guidance in the create dialog.
 */
router.get(
  "/preview-recipients",
  auth,
  requireRole("SUPER_ADMIN", "DEAN"),
  async (req, res) => {
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
  },
);

/**
 * GDPR / FERPA data export — returns the requesting user's own announcement-
 * related personal data: read receipts, acknowledgements, comments, reactions.
 * Audit rows authored by the user are included with `actorIdHash` so any
 * subsequent erasure leaves the data correlatable but de-identified.
 */
router.get("/me/data-export", auth, async (req, res) => {
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
});

router.get("/me-visibility", auth, async (req, res) => {
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
});

router.post(
  "/",
  auth,
  requireRole("SUPER_ADMIN", "DEAN"),
  announcementsCreateLimiter,
  idempotencyAnnouncementsPost,
  upload.array("images", 10),
  async (req, res) => {
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

    const [createdWithLiked] = await withLikedByCurrentUser(
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
});

router.get("/search", auth, async (req, res) => {
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

    announcements = await withLikedByCurrentUser(announcements, currentUserId);
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
});

/**
 * RFC 5545 iCalendar for visible announcement deadlines (same visibility as JSON `calendar-deadlines`).
 * All-day: `deadlineAt` at UTC midnight → `DTSTART;VALUE=DATE` / exclusive `DTEND;VALUE=DATE`.
 */
router.get("/calendar-deadlines.ics", auth, async (req, res) => {
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
});

/**
 * JSON list of announcement deadlines visible to the caller.
 * `deadlineAllDay`: true when `deadlineAt` is exactly UTC midnight (see calendar-deadlines.ics).
 */
router.get("/calendar-deadlines", auth, async (req, res) => {
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
});

/**
 * Operator/ops endpoint: count of SCHEDULED announcements whose publishedAt
 * has passed by more than `?thresholdSec` (default 600). Used by dashboards
 * and alerting — a non-zero count means BullMQ + the DB fallback both failed
 * to publish on time. Restricted to admins.
 */
router.get(
  "/admin/scheduled-overdue",
  auth,
  requireRole("SUPER_ADMIN", "DEAN"),
  async (req, res) => {
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
  },
);

router.get(
  "/admin/sms-audit",
  auth,
  requireRole("SUPER_ADMIN"),
  validateQuery(smsAuditListQuerySchema),
  async (req, res) => {
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
  },
);

router.get("/:id/analytics", auth, async (req, res) => {
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
});

function csvEscapeCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get(
  "/:id/acknowledgements",
  auth,
  validateQuery(ackListQuerySchema),
  async (req, res) => {
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
  },
);

router.post("/:id/trackable-link", auth, async (req, res) => {
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
});

router.get("/:id/audit", auth, async (req, res) => {
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
});

router.post("/:id/acknowledge", auth, async (req, res) => {
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
});

router.post("/:id/like", auth, async (req, res) => {
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

    const whereUnique = {
      announcementId_userId_emoji: {
        announcementId,
        userId,
        emoji: ANNOUNCEMENT_LIKE_EMOJI,
      },
    };
    // Atomic toggle: try to insert; on unique-violation (P2002) the row already
    // exists, so we delete it. Both branches end in a count() inside the same
    // transaction to return a consistent value to the client. This eliminates
    // the read-then-write race window where two concurrent clicks could either
    // both create (caught by the unique index) or both delete (returning a
    // stale count from a separate query).
    const { likes, likedByCurrentUser } = await prisma.$transaction(async (tx) => {
      let liked;
      try {
        await tx.announcementReaction.create({
          data: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
        });
        liked = true;
      } catch (err) {
        if (err?.code !== "P2002") throw err;
        // Row already exists — toggle off. `deleteMany` is idempotent if a
        // concurrent request beat us to it (deletes 0 rows without throwing).
        await tx.announcementReaction.deleteMany({
          where: { announcementId, userId, emoji: ANNOUNCEMENT_LIKE_EMOJI },
        });
        liked = false;
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
});

router.post("/read-bulk", auth, readBulkLimiter, async (req, res) => {
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
});

router.delete("/:id", auth, requireRole("SUPER_ADMIN", "DEAN"), async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const actorId = Number(req.user.sub);
    const beforeRow = await prisma.announcement.findUnique({
      where: { id },
      include: { targets: { select: { scopeType: true, scopeId: true } } },
    });
    const beforeSnap = beforeRow ? previewAnnouncementSnapshot(beforeRow) : null;

    try {
      await prisma.announcement.update({
        where: { id },
        data: { isActive: false, status: "ARCHIVED" },
      });
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      await prisma.announcement.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await writeAnnouncementAudit(prisma, actorId, id, "DELETE", beforeSnap, { archived: true });
    res.json({ success: true, id });
  } catch (error) {
    announcementLog("error", "announcement.delete_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to delete announcement", null));
  }
});

router.get("/:id", auth, async (req, res) => {
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
});

router.patch("/:id", auth, async (req, res) => {
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
    const [patchedWithLiked] = await withLikedByCurrentUser(
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
});

router.patch("/:id/pin", auth, requireRole("SUPER_ADMIN", "DEAN"), async (req, res) => {
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

    const [pinnedWithLiked] = await withLikedByCurrentUser(
      result.announcement ? [result.announcement] : [],
      userId,
    );
    res.json(toAnnouncementDto(pinnedWithLiked ?? result.announcement, userId));
  } catch (error) {
    announcementLog("error", "announcement.pin_failed", { message: error?.message ?? String(error) });
    res.status(500).json(apiErrorBody("Failed to toggle pin", null));
  }
});

router.post("/:id/read", auth, async (req, res) => {
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
});

export default router;
