import { previewText } from './buildGroupInboxRows.js'

export function buildDmInboxRows({ dms, userId, lastByDm, unreadByGroupDm }) {
  return dms.map((d) => {
    const others = d.members
      .filter((m) => Number(m.userId) !== userId)
      .map((m) => m.user)
    const title =
      d.name?.trim() ||
      others.map((u) => u?.full_name).filter(Boolean).join(', ') ||
      'Direct message'
    const isOneToOne = d.members.length === 2
    const last = lastByDm.get(d.id)
    const first = last?.sender?.full_name?.split(/\s+/)[0]
    // Group icon if set; otherwise the other person's photo for a 1:1 DM.
    const avatarUrl = d.iconUrl || (isOneToOne ? others[0]?.avatarUrl ?? null : null)

    return {
      type: 'dm',
      key: `dm-${d.id}`,
      id: d.publicId,
      title,
      subtitle: isOneToOne ? null : `${d.members.length} members`,
      avatarUrl,
      preview: last
        ? `${first && !isOneToOne ? `${first}: ` : ''}${previewText(last.content)}`
        : '',
      timestamp: last?.createdAt ?? null,
      unreadCount: unreadByGroupDm.get(d.id) ?? 0,
      href: `/dashboard/messages?dm=${d.publicId}`,
    }
  })
}
