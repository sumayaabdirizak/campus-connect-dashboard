import { redactPhone } from '../../features/announcements/services/announcementSms.service.js';
import { SOURCE_LABELS } from './constants.js';
import { actorFromRelation, enrichEntry, normalizeActionLabel } from './entry-enrichment.js';

export function mapAnnouncementRow(row) {
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

export function mapDiscussionRow(row) {
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

export function mapClubRow(row) {
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

export function mapSmsRow(row) {
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
