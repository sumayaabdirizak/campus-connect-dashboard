import {
  announcementIlikeTitleContentWhere,
  resolveAnnouncementTextSearch,
} from "./announcementSearch.service.js";
import { normalizeTargetRoles } from "./announcementService.js";

/** @deprecated Prefer {@link resolveAnnouncementTextSearch} name; kept for route imports. */
export const resolveAnnouncementQuerySearchIds = resolveAnnouncementTextSearch;

/**
 * @typedef {"drafts" | "scheduled" | "main"} AnnouncementListMode
 */

/**
 * @typedef {Object} ParsedAnnouncementListFilters
 * @property {AnnouncementListMode} listMode
 * @property {number} userId
 * @property {string | null} q
 * @property {import("@prisma/client").AnnouncementPriority | null} priority
 * @property {import("@prisma/client").AnnouncementBroadcastScope | null} targetType
 * @property {Date | null} dateFrom
 * @property {Date | null} dateTo
 * @property {import("@prisma/client").AnnouncementStatus | null} status
 * @property {"READ" | "UNREAD" | null} read
 * @property {string | null} audienceRole normalized announcement target role (STUDENT, TEACHER, …) or null
 */

/**
 * @param {string | undefined} label
 * @param {unknown} value
 * @returns {{ ok: true, value: Date | null } | { ok: false, message: string }}
 */
function parseOptionalDate(label, value) {
  if (value == null || String(value).trim() === "") return { ok: true, value: null };
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return { ok: false, message: `Invalid ${label}` };
  }
  return { ok: true, value: d };
}

const PRIORITIES = new Set(["normal", "important", "urgent"]);
const TARGET_TYPES = new Set(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]);
/** Status values allowed as an extra AND filter on the main feed (tab modes handle DRAFT/SCHEDULED separately). */
const MAIN_LIST_STATUS = new Set(["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]);

/**
 * Parse optional list filters from the query string. All fields optional; invalid enums/dates → ok: false.
 *
 * **`read`:** `READ` / `UNREAD` filter on {@link buildAnnouncementReadReceiptFilterWhere} (join `AnnouncementRead` for the authenticated user only).
 *
 * @param {import("express").Request["query"]} query
 * @param {{ listMode: AnnouncementListMode, userId: number }} ctx
 * @returns {{ ok: true, value: ParsedAnnouncementListFilters } | { ok: false, message: string }}
 */
export function parseAnnouncementListFilters(query, ctx) {
  const raw = query ?? {};
  const userId = ctx.userId;
  if (!Number.isFinite(userId)) {
    return { ok: false, message: "Invalid user context" };
  }

  const qRaw = raw.q != null ? String(raw.q).trim() : "";
  const q = qRaw.length > 0 ? qRaw : null;

  let priority = null;
  if (raw.priority != null && String(raw.priority).trim() !== "") {
    const p = String(raw.priority).trim().toLowerCase();
    if (!PRIORITIES.has(p)) return { ok: false, message: "Invalid priority" };
    /** @type {import("@prisma/client").AnnouncementPriority} */
    priority = /** @type {import("@prisma/client").AnnouncementPriority} */ (p);
  }

  let targetType = null;
  if (raw.targetType != null && String(raw.targetType).trim() !== "") {
    const tt = String(raw.targetType).trim().toUpperCase();
    if (!TARGET_TYPES.has(tt)) return { ok: false, message: "Invalid targetType" };
    /** @type {import("@prisma/client").AnnouncementBroadcastScope} */
    targetType = /** @type {import("@prisma/client").AnnouncementBroadcastScope} */ (tt);
  }

  const fromRes = parseOptionalDate("dateFrom", raw.dateFrom);
  if (!fromRes.ok) return fromRes;
  const toRes = parseOptionalDate("dateTo", raw.dateTo);
  if (!toRes.ok) return toRes;
  const dateFrom = fromRes.value;
  const dateTo = toRes.value;
  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    return { ok: false, message: "dateFrom must be before or equal to dateTo" };
  }

  /**
   * `read` query: `READ` | `UNREAD` | `ALL` (case-insensitive). Omit or `ALL` = no read filter.
   * Semantics: {@link buildAnnouncementReadReceiptFilterWhere}.
   */
  let read = null;
  if (raw.read != null && String(raw.read).trim() !== "") {
    const r = String(raw.read).trim().toUpperCase();
    if (r === "ALL") read = null;
    else if (r === "READ") read = "READ";
    else if (r === "UNREAD") read = "UNREAD";
    else return { ok: false, message: "Invalid read" };
  }

  let status = null;
  if (ctx.listMode === "main" && raw.status != null && String(raw.status).trim() !== "") {
    const st = String(raw.status).trim().toUpperCase();
    if (!MAIN_LIST_STATUS.has(st)) return { ok: false, message: "Invalid status" };
    status = /** @type {import("@prisma/client").AnnouncementStatus} */ (st);
  }

  /** `role` query: filter rows whose `targetRoles` includes this audience (matches UI URL `?role=`). */
  let audienceRole = null;
  if (raw.role != null && String(raw.role).trim() !== "") {
    const ru = String(raw.role).trim().toUpperCase();
    if (ru !== "ALL") {
      const normalized = normalizeTargetRoles([ru]);
      if (normalized.length !== 1) {
        return { ok: false, message: "Invalid role filter" };
      }
      audienceRole = normalized[0];
    }
  }

  return {
    ok: true,
    value: {
      listMode: ctx.listMode,
      userId,
      q,
      priority,
      targetType,
      dateFrom,
      dateTo,
      status,
      read,
      audienceRole,
    },
  };
}

/**
 * Filter announcements by **this user's** `AnnouncementRead` rows (SQL join via Prisma relation `reads`).
 *
 * - **`READ`**: `reads.some({ userId })` — at least one read receipt for the authenticated user.
 * - **`UNREAD`**: `reads.none({ userId })` — no read receipt row for that user on this announcement.
 * - Other users' receipts are irrelevant; the subquery is always scoped to `userId`.
 *
 * ### SCHEDULED (future `publishedAt`)
 * Recipients usually **do not** see those rows in the main feed until publish time, so they do not interact
 * with read state for them. **Creators/publishers** may still list their own future `SCHEDULED` posts; then
 * `read=UNREAD` typically matches all (no self read row yet). After the post becomes visible to readers,
 * the same announcement id keeps using `AnnouncementRead`; the filter still means only **the caller's** read state.
 *
 * @param {number} userId authenticated user id (`AnnouncementRead.userId`)
 * @param {"READ" | "UNREAD" | null | undefined} mode
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput | null}
 */
export function buildAnnouncementReadReceiptFilterWhere(userId, mode) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return null;
  if (mode === "READ") {
    return { reads: { some: { userId: uid } } };
  }
  if (mode === "UNREAD") {
    return { reads: { none: { userId: uid } } };
  }
  return null;
}

/**
 * Build an optional Prisma `where` fragment AND-ed with visibility. Returns `null` when no filters apply.
 *
 * @param {ParsedAnnouncementListFilters} parsed
 * @param {{ searchIds: number[] | null, useLegacyTextSearch: boolean }} search
 * @returns {import("@prisma/client").Prisma.AnnouncementWhereInput | null}
 */
export function buildAnnouncementListFilterWhere(parsed, search) {
  const { searchIds, useLegacyTextSearch } = search;
  /** @type {import("@prisma/client").Prisma.AnnouncementWhereInput[]} */
  const clauses = [];

  if (parsed.priority) clauses.push({ priority: parsed.priority });
  if (parsed.targetType) clauses.push({ targetType: parsed.targetType });

  if (parsed.dateFrom || parsed.dateTo) {
    /** @type {import("@prisma/client").Prisma.DateTimeFilter} */
    const range = {};
    if (parsed.dateFrom) range.gte = parsed.dateFrom;
    if (parsed.dateTo) range.lte = parsed.dateTo;
    clauses.push({ createdAt: range });
  }

  if (parsed.listMode === "main" && parsed.status) {
    clauses.push({ status: parsed.status });
  }

  const readWhere = buildAnnouncementReadReceiptFilterWhere(parsed.userId, parsed.read);
  if (readWhere) clauses.push(readWhere);

  if (parsed.audienceRole) {
    const r = parsed.audienceRole;
    if (r === "TEACHER") {
      clauses.push({
        OR: [{ targetRoles: { has: "TEACHER" } }, { targetRoles: { has: "LECTURER" } }],
      });
    } else {
      clauses.push({ targetRoles: { has: r } });
    }
  }

  if (parsed.q && parsed.q.length >= 2) {
    if (useLegacyTextSearch) {
      clauses.push(announcementIlikeTitleContentWhere(parsed.q));
    } else if (searchIds != null) {
      clauses.push({ id: { in: searchIds } });
    }
  }

  if (!clauses.length) return null;
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}
