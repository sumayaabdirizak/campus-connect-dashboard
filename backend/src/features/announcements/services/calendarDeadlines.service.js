import {
  buildVisibleAnnouncementsWhere,
  buildVisibleAnnouncementsWhereLegacy,
  isPrismaAnnouncementSchemaDriftError,
} from "./announcementVisibility.service.js";

/**
 * **All-day rule (API + iCal):** `deadlineAt` stored in UTC. If the instant is exactly
 * `00:00:00.000Z`, clients and ICS treat it as an **all-day** calendar date (no time-of-day).
 * Any other UTC time is a **timed** deadline (floating UTC in ICS via `Z` suffix).
 *
 * @param {Date | string | null | undefined} deadlineAt
 */
export function isAnnouncementDeadlineAllDayUtc(deadlineAt) {
  if (!deadlineAt) return false;
  const d = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {unknown} visibilityUser
 * @param {Date} fromRaw
 * @param {Date} toRaw
 */
export async function loadVisibleCalendarDeadlineRows(prisma, visibilityUser, fromRaw, toRaw) {
  const baseWhere = buildVisibleAnnouncementsWhere(visibilityUser);
  const rangeWhere = {
    deadlineAt: { not: null, gte: fromRaw, lte: toRaw },
  };

  let rows;
  try {
    rows = await prisma.announcement.findMany({
      where: { AND: [baseWhere, rangeWhere] },
      select: {
        id: true,
        title: true,
        content: true,
        deadlineAt: true,
        targetType: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
      },
      orderBy: { deadlineAt: "asc" },
      take: 500,
    });
  } catch (err) {
    if (!isPrismaAnnouncementSchemaDriftError(err)) throw err;
    rows = await prisma.announcement.findMany({
      where: { AND: [buildVisibleAnnouncementsWhereLegacy(visibilityUser), rangeWhere] },
      select: {
        id: true,
        title: true,
        content: true,
        deadlineAt: true,
        targetType: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
      },
      orderBy: { deadlineAt: "asc" },
      take: 500,
    });
  }
  return rows;
}

function escapeIcsText(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line) {
  const max = 73;
  if (line.length <= max) return line;
  let out = "";
  let rest = line;
  while (rest.length > max) {
    out += `${rest.slice(0, max)}\r\n `;
    rest = rest.slice(max);
  }
  return out + rest;
}

function formatIcsUtc(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function formatIcsDateUtc(dt) {
  const d = dt instanceof Date ? dt : new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/**
 * RFC 5545 iCalendar feed for visible announcement deadlines.
 *
 * @param {Array<import("@prisma/client").Announcement & { deadlineAt: Date | null }>} rows
 * @param {{ prodId?: string; calName?: string; frontendBaseUrl?: string }} [opts]
 */
export function buildCalendarDeadlinesIcs(rows, opts = {}) {
  const prodId = opts.prodId || "-//Campus Connect//Announcement Deadlines//EN";
  const calName = opts.calName || "Campus announcement deadlines";
  const baseUrl = String(opts.frontendBaseUrl || process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:${escapeIcsText(prodId)}`);
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(foldLine(`X-WR-CALNAME:${escapeIcsText(calName)}`));
  lines.push("REFRESH-VALUE;VALUE=DURATION:PT12H");
  lines.push(`DTSTAMP:${formatIcsUtc(new Date())}`);

  for (const r of rows) {
    if (!r.deadlineAt) continue;
    const uid = `announcement-deadline-${r.id}@campus-connect`;
    const title = escapeIcsText(r.title || "Announcement");
    const url = `${baseUrl}/dashboard/announcements`;
    const descPlain = escapeIcsText(String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 1800));
    const allDay = isAnnouncementDeadlineAllDayUtc(r.deadlineAt);
    const dtstamp = formatIcsUtc(new Date());

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(foldLine(`SUMMARY:${title}`));
    lines.push(foldLine(`URL:${escapeIcsText(url)}#${r.id}`));
    if (descPlain) lines.push(foldLine(`DESCRIPTION:${descPlain}`));
    if (allDay) {
      const d = formatIcsDateUtc(r.deadlineAt);
      const endDt = new Date(r.deadlineAt);
      endDt.setUTCDate(endDt.getUTCDate() + 1);
      const dEnd = formatIcsDateUtc(endDt);
      lines.push(`DTSTART;VALUE=DATE:${d}`);
      lines.push(`DTEND;VALUE=DATE:${dEnd}`);
    } else {
      lines.push(`DTSTART:${formatIcsUtc(r.deadlineAt)}`);
      const end = new Date(r.deadlineAt);
      end.setUTCHours(end.getUTCHours() + 1);
      lines.push(`DTEND:${formatIcsUtc(end)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
