import { prisma } from '../db/prisma.js';
import { redactPhone } from '../features/announcements/services/announcementSms.service.js';

const SOURCE_LABELS = {
  announcement: 'Announcements',
  discussion: 'Discussions',
  club: 'Clubs',
  sms: 'SMS',
};

const MODULE_MAP = {
  announcement: 'Announcements',
  discussion: 'Discussions',
  club: 'Clubs',
  sms: 'Notifications',
};

const DISCUSSION_ACTION_LABELS = {
  CHANNEL_UPDATE: 'Updated channel settings',
  CHANNEL_ARCHIVE: 'Archived channel',
  CHANNEL_UNARCHIVE: 'Restored channel',
  CHANNEL_HARD_DELETE: 'Deleted channel',
  PERMISSION_OVERWRITE_UPSERT: 'Updated permission overwrite',
  PERMISSION_OVERWRITE_DELETE: 'Removed permission overwrite',
  MESSAGE_PIN: 'Pinned message',
  MESSAGE_UNPIN: 'Unpinned message',
  MEMBER_MUTE: 'Muted member',
  MEMBER_UNMUTE: 'Lifted member mute',
  MEMBER_KICK: 'Removed member from server',
};

const CRITICAL_ACTIONS = new Set([
  'CHANNEL_HARD_DELETE',
  'MEMBER_KICK',
  'REJECT',
  'SUSPEND',
  'FAILED',
]);

const WARNING_ACTIONS = new Set([
  'CHANNEL_ARCHIVE',
  'MEMBER_MUTE',
  'SKIPPED',
]);

function parseDate(raw) {
  if (raw == null || raw === '') return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

function buildDateWhere(dateFrom, dateTo, field = 'createdAt') {
  if (!dateFrom && !dateTo) return {};
  const range = {};
  if (dateFrom) range.gte = dateFrom;
  if (dateTo) range.lte = dateTo;
  return { [field]: range };
}

function inferActionType(action, source) {
  const a = String(action).toUpperCase();
  if (a.includes('CREATE') || a === 'CREATE') return 'create';
  if (a.includes('DELETE') || a.includes('HARD_DELETE') || a === 'REMOVE_MEMBER') return 'delete';
  if (a.includes('APPROVE')) return 'approve';
  if (a.includes('REJECT')) return 'reject';
  if (a.includes('LOGIN')) return 'login';
  if (a.includes('LOGOUT')) return 'logout';
  if (a.includes('EXPORT')) return 'export';
  if (a.includes('IMPORT')) return 'import';
  if (source === 'sms') return 'update';
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('UPSERT') || a.includes('PIN')) return 'update';
  return 'update';
}

function inferSeverity(action, source, status) {
  const a = String(action).toUpperCase();
  if (status === 'failed' || a === 'FAILED') return 'critical';
  if (CRITICAL_ACTIONS.has(a)) return 'critical';
  if (WARNING_ACTIONS.has(a) || a.includes('ARCHIVE') || a.includes('SUSPEND')) return 'warning';
  if (a === 'SKIPPED') return 'warning';
  if (source === 'sms' && a === 'FAILED') return 'error';
  return 'info';
}

function inferStatus(action, source) {
  const a = String(action).toUpperCase();
  if (source === 'sms' && (a === 'FAILED' || a === 'SKIPPED')) return 'failed';
  return 'success';
}

function normalizeActionLabel(source, action) {
  if (source === 'discussion') return DISCUSSION_ACTION_LABELS[action] ?? action;
  if (source === 'club') {
    return String(action)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (source === 'sms') return `SMS ${String(action).toLowerCase()}`;
  return String(action)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDescription(entry) {
  if (entry.summary) return String(entry.summary);
  const target = entry.targetLabel ? ` on ${entry.targetLabel}` : '';
  return `${entry.actionLabel}${target}.`;
}

function actorFromRelation(actorId, actor) {
  if (actor?.full_name) {
    return {
      actorId: actor.id ?? actorId,
      actorName: actor.full_name,
      actorEmail: actor.email ?? null,
      actorRole: actor.role?.name ?? null,
    };
  }
  if (actorId != null) {
    return {
      actorId,
      actorName: `User #${actorId}`,
      actorEmail: null,
      actorRole: null,
    };
  }
  return { actorId: null, actorName: 'System', actorEmail: null, actorRole: null };
}

function enrichEntry(base) {
  const status = inferStatus(base.action, base.source);
  const severity = inferSeverity(base.action, base.source, status);
  const actionType = inferActionType(base.action, base.source);
  const enriched = {
    ...base,
    module: MODULE_MAP[base.source] ?? 'System',
    actionType,
    severity,
    status,
    description: buildDescription(base),
    resourceId: base.targetId,
    ipAddress: null,
    sessionId: null,
    browser: null,
    device: null,
    operatingSystem: null,
    errorMessage: status === 'failed' ? base.summary ?? 'Operation did not complete successfully.' : null,
  };
  return enriched;
}

function mapAnnouncementRow(row) {
  const actor = actorFromRelation(row.actorId, row.actor);
  const base = {
    id: `announcement:${row.id}`,
    source: 'announcement',
    sourceLabel: SOURCE_LABELS.announcement,
    action: row.action,
    actionLabel: normalizeActionLabel('announcement', row.action),
    ...actor,
    actorName: row.actorId == null && row.actorIdHash ? 'Erased user' : actor.actorName,
    actorEmail: row.actorId == null && row.actorIdHash ? null : actor.actorEmail,
    targetType: 'announcement',
    targetId: row.announcementId,
    targetLabel: row.announcement?.title ?? `Announcement #${row.announcementId}`,
    summary: null,
    before: row.before,
    after: row.after,
    createdAt: row.createdAt.toISOString(),
  };
  return enrichEntry(base);
}

function mapDiscussionRow(row) {
  const actor = actorFromRelation(row.actorUserId, row.actor);
  const serverName = row.server?.name ?? `Server #${row.serverId}`;
  const channelPart = row.channel?.name ? ` · ${row.channel.name}` : '';
  const base = {
    id: `discussion:${row.id}`,
    source: 'discussion',
    sourceLabel: SOURCE_LABELS.discussion,
    action: row.action,
    actionLabel: normalizeActionLabel('discussion', row.action),
    ...actor,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: `${serverName}${channelPart}`,
    summary: `${row.targetType} #${row.targetId}`,
    before: row.before,
    after: row.after,
    createdAt: row.createdAt.toISOString(),
  };
  return enrichEntry(base);
}

function mapClubRow(row) {
  const actor = actorFromRelation(row.actorUserId, row.actor);
  const base = {
    id: `club:${row.id}`,
    source: 'club',
    sourceLabel: SOURCE_LABELS.club,
    action: row.action,
    actionLabel: normalizeActionLabel('club', row.action),
    ...actor,
    targetType: 'club',
    targetId: row.clubId,
    targetLabel: row.club?.name ?? `Club #${row.clubId}`,
    summary: row.reason,
    before: null,
    after: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
  return enrichEntry(base);
}

function mapSmsRow(row) {
  const actor = actorFromRelation(row.userId, row.user);
  const base = {
    id: `sms:${row.id}`,
    source: 'sms',
    sourceLabel: SOURCE_LABELS.sms,
    action: row.status,
    actionLabel: normalizeActionLabel('sms', row.status),
    ...actor,
    targetType: 'announcement',
    targetId: row.announcementId,
    targetLabel: row.announcement?.title ?? `Announcement #${row.announcementId}`,
    summary: row.reason ?? redactPhone(row.phoneNumber),
    before: null,
    after: { phoneNumber: redactPhone(row.phoneNumber), status: row.status },
    createdAt: row.sentAt.toISOString(),
  };
  return enrichEntry(base);
}

const ACTOR_SELECT = {
  select: { id: true, full_name: true, email: true, role: { select: { name: true } } },
};

function matchesSearch(entry, search) {
  if (!search) return true;
  const q = search.toLowerCase();
  const haystack = [
    entry.action,
    entry.actionLabel,
    entry.actorName,
    entry.actorEmail,
    entry.targetLabel,
    entry.summary,
    entry.description,
    entry.module,
    entry.sourceLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesExtendedFilters(entry, filters) {
  if (filters.module && filters.module !== 'all' && entry.module !== filters.module) return false;
  if (filters.actionType && filters.actionType !== 'all' && entry.actionType !== filters.actionType)
    return false;
  if (filters.severity && filters.severity !== 'all' && entry.severity !== filters.severity)
    return false;
  if (filters.status && filters.status !== 'all' && entry.status !== filters.status) return false;
  return true;
}

async function countAnnouncementLogs(where) {
  return prisma.announcementAudit.count({ where });
}

async function countDiscussionLogs(where) {
  return prisma.discussionAuditLog.count({ where });
}

async function countClubLogs(where) {
  return prisma.clubModerationAudit.count({ where });
}

async function countSmsLogs(where) {
  return prisma.smsAuditLog.count({ where });
}

async function fetchAnnouncementLogs(where, { take, skip = 0 }) {
  const rows = await prisma.announcementAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      announcement: { select: { id: true, title: true } },
    },
  });
  return rows.map(mapAnnouncementRow);
}

async function fetchDiscussionLogs(where, { take, skip = 0 }) {
  const rows = await prisma.discussionAuditLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      server: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
  });
  return rows.map(mapDiscussionRow);
}

async function fetchClubLogs(where, { take, skip = 0 }) {
  const rows = await prisma.clubModerationAudit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    include: {
      actor: ACTOR_SELECT,
      club: { select: { id: true, name: true } },
    },
  });
  return rows.map(mapClubRow);
}

async function fetchSmsLogs(where, { take, skip = 0 }) {
  const rows = await prisma.smsAuditLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    skip,
    take,
    include: {
      user: ACTOR_SELECT,
      announcement: { select: { id: true, title: true } },
    },
  });
  return rows.map(mapSmsRow);
}

function sourceFromModule(module) {
  const map = {
    Announcements: 'announcement',
    Discussions: 'discussion',
    Clubs: 'club',
    Notifications: 'sms',
  };
  return map[module] ?? null;
}

function buildAnnouncementWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorId = actorId;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { announcement: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

function buildDiscussionWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorUserId = actorId;
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { targetType: { contains: search, mode: 'insensitive' } },
      { server: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

function buildClubWhere({ dateFrom, dateTo, actorId, search }) {
  const where = { ...buildDateWhere(dateFrom, dateTo) };
  if (actorId != null) where.actorUserId = actorId;
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { club: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

function buildSmsWhere({ dateFrom, dateTo, actorId, search, status }) {
  const where = { ...buildDateWhere(dateFrom, dateTo, 'sentAt') };
  if (actorId != null) where.userId = actorId;
  if (status === 'failed') where.status = { in: ['FAILED', 'SKIPPED'] };
  if (status === 'success') where.status = 'SENT';
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { announcement: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

const SOURCE_FETCHERS = {
  announcement: {
    buildWhere: buildAnnouncementWhere,
    count: countAnnouncementLogs,
    fetch: fetchAnnouncementLogs,
  },
  discussion: {
    buildWhere: buildDiscussionWhere,
    count: countDiscussionLogs,
    fetch: fetchDiscussionLogs,
  },
  club: {
    buildWhere: buildClubWhere,
    count: countClubLogs,
    fetch: fetchClubLogs,
  },
  sms: {
    buildWhere: buildSmsWhere,
    count: countSmsLogs,
    fetch: fetchSmsLogs,
  },
};

function resolveActiveSources(source, module) {
  if (source && source !== 'all') {
    return SOURCE_FETCHERS[source] ? [source] : [];
  }
  if (module && module !== 'all') {
    const mapped = sourceFromModule(module);
    return mapped ? [mapped] : Object.keys(SOURCE_FETCHERS);
  }
  return Object.keys(SOURCE_FETCHERS);
}

/**
 * @param {{
 *   source?: string | null;
 *   module?: string | null;
 *   actionType?: string | null;
 *   severity?: string | null;
 *   status?: string | null;
 *   page?: number;
 *   pageSize?: number;
 *   dateFrom?: string | null;
 *   dateTo?: string | null;
 *   actorId?: number | null;
 *   search?: string | null;
 * }} opts
 */
export async function listPlatformAuditLogs(opts = {}) {
  const page = Number.isFinite(opts.page) && opts.page >= 1 ? Math.floor(opts.page) : 1;
  const pageSize =
    Number.isFinite(opts.pageSize) && opts.pageSize >= 1
      ? Math.min(100, Math.floor(opts.pageSize))
      : 25;
  const skip = (page - 1) * pageSize;

  const dateFrom = parseDate(opts.dateFrom);
  const dateTo = parseDate(opts.dateTo);
  const actorId =
    opts.actorId != null && Number.isFinite(Number(opts.actorId)) ? Number(opts.actorId) : null;
  const search = opts.search?.trim() || null;
  const source = opts.source && opts.source !== 'all' ? opts.source : 'all';
  const extendedFilters = {
    module: opts.module && opts.module !== 'all' ? opts.module : null,
    actionType: opts.actionType && opts.actionType !== 'all' ? opts.actionType : null,
    severity: opts.severity && opts.severity !== 'all' ? opts.severity : null,
    status: opts.status && opts.status !== 'all' ? opts.status : null,
  };

  const filterOpts = { dateFrom, dateTo, actorId, search, status: extendedFilters.status };
  const activeSources = resolveActiveSources(source, extendedFilters.module);

  if (!activeSources.length) {
    return { page, pageSize, total: 0, totalCount: 0, results: [] };
  }

  const needsPostFilter =
    extendedFilters.actionType || extendedFilters.severity ||
    (extendedFilters.status && activeSources.length > 1);

  if (source !== 'all' && !needsPostFilter && !extendedFilters.module) {
    const handler = SOURCE_FETCHERS[source];
    const where = handler.buildWhere(filterOpts);
    let results = await handler.fetch(where, { take: pageSize * 3, skip: 0 });
    results = results.filter((e) => matchesExtendedFilters(e, extendedFilters));
    const total = results.length >= pageSize * 3 ? await handler.count(where) : results.length;
    return {
      page,
      pageSize,
      total,
      totalCount: total,
      results: results.slice(skip, skip + pageSize),
    };
  }

  const mergeLimit = Math.min(1000, (skip + pageSize) * 4);
  const batches = await Promise.all(
    activeSources.map((key) => {
      const handler = SOURCE_FETCHERS[key];
      return handler.fetch(handler.buildWhere(filterOpts), { take: mergeLimit, skip: 0 });
    }),
  );

  let merged = batches
    .flat()
    .filter((entry) => matchesExtendedFilters(entry, extendedFilters))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (search) merged = merged.filter((entry) => matchesSearch(entry, search));

  const total = merged.length;
  const results = merged.slice(skip, skip + pageSize);

  return { page, pageSize, total, totalCount: total, results };
}

export async function getPlatformAuditStats() {
  const today = startOfToday();
  const yesterday = startOfYesterday();

  const [
    totalAnnouncement,
    totalDiscussion,
    totalClub,
    totalSms,
    todayAnnouncement,
    todayDiscussion,
    todayClub,
    todaySms,
    yesterdayAnnouncement,
    yesterdayDiscussion,
    yesterdayClub,
    yesterdaySms,
    failedSms,
    criticalDiscussion,
    criticalClub,
  ] = await Promise.all([
    prisma.announcementAudit.count(),
    prisma.discussionAuditLog.count(),
    prisma.clubModerationAudit.count(),
    prisma.smsAuditLog.count(),
    prisma.announcementAudit.count({ where: { createdAt: { gte: today } } }),
    prisma.discussionAuditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.clubModerationAudit.count({ where: { createdAt: { gte: today } } }),
    prisma.smsAuditLog.count({ where: { sentAt: { gte: today } } }),
    prisma.announcementAudit.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.discussionAuditLog.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.clubModerationAudit.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.smsAuditLog.count({ where: { sentAt: { gte: yesterday, lt: today } } }),
    prisma.smsAuditLog.count({ where: { status: { in: ['FAILED', 'SKIPPED'] } } }),
    prisma.discussionAuditLog.count({
      where: { action: { in: ['CHANNEL_HARD_DELETE', 'MEMBER_KICK'] } },
    }),
    prisma.clubModerationAudit.count({
      where: { action: { in: ['REJECT', 'SUSPEND'] } },
    }),
  ]);

  const totalEvents = totalAnnouncement + totalDiscussion + totalClub + totalSms;
  const todayActivities = todayAnnouncement + todayDiscussion + todayClub + todaySms;
  const yesterdayActivities =
    yesterdayAnnouncement + yesterdayDiscussion + yesterdayClub + yesterdaySms;
  const failedActions = failedSms;
  const criticalEvents = criticalDiscussion + criticalClub + failedSms;

  const [annActors, discActors, clubActors, smsActors] = await Promise.all([
    prisma.announcementAudit.findMany({
      where: { createdAt: { gte: today }, actorId: { not: null } },
      distinct: ['actorId'],
      select: { actorId: true },
    }),
    prisma.discussionAuditLog.findMany({
      where: { createdAt: { gte: today } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
    }),
    prisma.clubModerationAudit.findMany({
      where: { createdAt: { gte: today }, actorUserId: { not: null } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
    }),
    prisma.smsAuditLog.findMany({
      where: { sentAt: { gte: today } },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  const activeUserIds = new Set([
    ...annActors.map((r) => r.actorId),
    ...discActors.map((r) => r.actorUserId),
    ...clubActors.map((r) => r.actorUserId),
    ...smsActors.map((r) => r.userId),
  ]);

  const todayTrend =
    yesterdayActivities === 0
      ? todayActivities > 0
        ? 100
        : 0
      : Math.round(((todayActivities - yesterdayActivities) / yesterdayActivities) * 100);

  return {
    totalEvents,
    todayActivities,
    failedActions,
    criticalEvents,
    activeUsersToday: activeUserIds.size,
    trends: {
      todayActivities: todayTrend,
      totalEvents: 0,
      failedActions: 0,
      criticalEvents: 0,
      activeUsersToday: 0,
    },
  };
}

export async function listAuditActors() {
  const [ann, disc, club, sms] = await Promise.all([
    prisma.announcementAudit.findMany({
      where: { actorId: { not: null } },
      distinct: ['actorId'],
      select: { actorId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.discussionAuditLog.findMany({
      distinct: ['actorUserId'],
      select: { actorUserId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.clubModerationAudit.findMany({
      where: { actorUserId: { not: null } },
      distinct: ['actorUserId'],
      select: { actorUserId: true },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.smsAuditLog.findMany({
      distinct: ['userId'],
      select: { userId: true },
      orderBy: { sentAt: 'desc' },
      take: 80,
    }),
  ]);

  const ids = [
    ...new Set([
      ...ann.map((r) => r.actorId),
      ...disc.map((r) => r.actorUserId),
      ...club.map((r) => r.actorUserId),
      ...sms.map((r) => r.userId),
    ]),
  ].filter(Boolean);

  if (!ids.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids.slice(0, 100) } },
    select: { id: true, full_name: true, email: true, role: { select: { name: true } } },
    orderBy: { full_name: 'asc' },
  });

  return users.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role?.name ?? null,
  }));
}
