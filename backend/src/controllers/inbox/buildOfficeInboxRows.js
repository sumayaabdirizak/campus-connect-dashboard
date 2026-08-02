import { previewText } from './buildGroupInboxRows.js'

export function buildOfficeInboxRows({ officeThreads, lastByOffice, unreadByOffice }) {
  return officeThreads.map((t) => {
    const last = lastByOffice.get(t.id)
    const isStaff = t.viewerIsStaff === true
    const unread = unreadByOffice?.get(t.id)
    return {
      type: 'office',
      officeKind: 'thread',
      key: `office-${t.id}`,
      id: t.id,
      officeSlug: t.office?.slug ?? null,
      title: isStaff ? (t.student?.full_name ?? 'Student') : (t.office?.name ?? 'Office'),
      subtitle: isStaff
        ? `${t.office?.name ?? 'Office'} · ${t.topic} · ${t.reference}`
        : `${t.topic} · ${t.reference}`,
      avatarUrl: null,
      preview: previewText(last?.content) || t.topic,
      timestamp: last?.createdAt ?? t.updatedAt,
      unreadCount:
        unread != null
          ? unread
          : isStaff
            ? t.status === 'OPEN'
              ? 1
              : 0
            : t.status === 'AWAITING_STUDENT'
              ? 1
              : 0,
      badge: t.status,
      href: `/dashboard/messages?officeThread=${t.id}`,
    }
  })
}
