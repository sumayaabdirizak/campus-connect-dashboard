import { previewText } from './buildGroupInboxRows.js';

/**
 * DM-like office rows for oversight — always listed; preview from AO↔office chat.
 */
export function buildOfficeDeskInboxRows(offices) {
  return offices.map((o) => {
    const hasDm = Boolean(o.dmThread);
    const last = o.lastMessage;
    const facultyId = o.facultyId ?? o.faculty?.id ?? null;
    return {
      type: 'office',
      officeKind: 'desk',
      key: `office-desk-${o.id}`,
      id: o.id,
      officeSlug: o.slug,
      facultyId: facultyId != null ? Number(facultyId) : null,
      facultyName: o.faculty?.name ?? null,
      title: o.name,
      subtitle: o.faculty?.name
        ? `Faculty · ${o.faculty.name}`
        : 'University desk',
      avatarUrl: null,
      preview: hasDm
        ? previewText(last?.content) || o.dmThread.topic || 'Conversation'
        : 'Tap to message — like a direct chat',
      timestamp: last?.createdAt ?? o.dmThread?.updatedAt ?? null,
      unreadCount: hasDm ? Number(o.unreadCount ?? 0) : 0,
      badge: hasDm ? o.dmThread.status : 'DM',
      href: `/dashboard/messages?officeDesk=${encodeURIComponent(o.slug)}`,
    };
  });
}
