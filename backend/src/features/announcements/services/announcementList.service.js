import { prisma } from "../../../db/prisma.js";
import { parsePaginationQuery, paginatedPayload, parseCursorPagination } from "../../../utils/pagination.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { loadUserAnnouncementScope } from "../../../utils/userAnnouncementScope.js";
import {
  toAnnouncementDto,
  buildAnnouncementCursorWhere,
  encodeAnnouncementCursor,
  announcementDtoPrismaInclude,
  announcementDtoPrismaIncludeLegacy,
} from "../dto/announcementDto.js";
import {
  CREATE_ANNOUNCEMENT_ROLES,
  getReadAnnouncementIdSet,
  sortAnnouncementsForList,
  visibilityUserFromLoaded,
} from "./announcementService.js";
import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  isPrismaAnnouncementSchemaDriftError,
} from "./announcementVisibility.service.js";
import {
  parseAnnouncementListFilters,
  resolveAnnouncementQuerySearchIds,
  buildAnnouncementListFilterWhere,
} from "./announcementListFilters.service.js";
import { attachLikedByCurrentUser } from "./announcementReactions.service.js";
import { announcementLog } from "../announcementLogger.js";

export async function handleAnnouncementList(req, res) {
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
        announcements = await loadPage((_vu) => draftWhere(), announcementDtoPrismaInclude, orderBy);
      } else if (scheduledOnly) {
        announcements = await loadPage(
          (_vu) => scheduledWhere(),
          announcementDtoPrismaInclude,
          scheduledOrderBy
        );
      } else {
        announcements = await loadPage(
          buildVisibleAnnouncementsWhere,
          announcementDtoPrismaInclude,
          orderBy
        );
      }
    } catch (err) {
      if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
      if (draftsOnly) {
        announcements = await loadPage(
          (_vu) => draftWhere(),
          announcementDtoPrismaIncludeLegacy,
          orderBy
        );
      } else if (scheduledOnly) {
        announcements = await loadPage(
          (_vu) => scheduledWhere(),
          announcementDtoPrismaIncludeLegacy,
          scheduledOrderBy
        );
      } else {
        listUsesLegacyWhere = true;
        announcements = await loadPage(
          buildVisibleAnnouncementsWhereLegacy,
          announcementDtoPrismaIncludeLegacy,
          orderBy
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

    announcements = await attachLikedByCurrentUser(announcements, currentUserId);

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
        currentUserId
      )
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
        })
      );
    }

    return res.json(
      paginatedPayload({
        total,
        page,
        pageSize,
        results: mapped,
      })
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
}
