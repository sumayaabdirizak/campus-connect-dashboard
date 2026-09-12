const PREVIEW_MAX = 120

export function previewText(content) {
  if (!content) return ''
  const s = String(content).replace(/\s+/g, ' ').trim()
  return s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX)}…` : s
}

function scopeLabel(scopeType) {
  if (scopeType === 'FACULTY') return 'Faculty'
  if (scopeType === 'DEPARTMENT') return 'Department'
  if (scopeType === 'BATCH') return 'Batch'
  if (scopeType === 'SECTION') return 'Section'
  if (scopeType === 'CLUB') return 'Club'
  return 'Group'
}

export function buildGroupInboxRows({
  groups,
  lastByGroup,
  unreadByGroup,
  legacyChannelByGroup,
  clubMetaByServerId = new Map(),
}) {
  return groups.map((g) => {
    const last = lastByGroup.get(g.id)
    const clubMeta = clubMetaByServerId.get(g.id)
    const isClub =
      Boolean(clubMeta) || g.kind === 'USER_SERVER' || g.scopeType === 'CLUB'
    const legacyCh = legacyChannelByGroup.get(g.id)
    // Always expose publicIds in hrefs — socket payloads use publicId, and the
    // open channel pane filters live messages with strict id equality.
    const channelId =
      g.defaultChannel?.publicId ?? legacyCh?.publicId ?? null
    const serverId =
      g.parentServer?.publicId ??
      legacyCh?.serverPublicId ??
      g.publicId ??
      null
    const first = last?.sender?.full_name?.split(/\s+/)[0]

    const clubHref =
      isClub && clubMeta?.slug
        ? `/dashboard/messages?club=${encodeURIComponent(clubMeta.slug)}`
        : null

    return {
      type: isClub ? 'club' : 'group',
      key: `${isClub ? 'club' : 'group'}-${g.publicId ?? g.id}`,
      id: g.publicId ?? g.id,
      title: clubMeta?.name || g.name,
      subtitle: isClub ? 'Club' : scopeLabel(g.scopeType),
      avatarUrl: clubMeta?.iconUrl || g.iconUrl || null,
      preview: last
        ? `${first ? `${first}: ` : ''}${previewText(last.content)}`
        : '',
      timestamp: last?.createdAt ?? null,
      unreadCount: unreadByGroup.get(g.publicId) ?? unreadByGroup.get(g.id) ?? 0,
      channelId,
      serverId,
      clubSlug: clubMeta?.slug ?? null,
      href:
        clubHref ??
        (channelId
          ? `/dashboard/messages?server=${serverId}&channel=${channelId}`
          : `/dashboard/messages?server=${serverId}`),
    }
  })
}
