import { prisma } from '../../../db/prisma.js'
import { buildUnreadSocketPayload } from '../../discussions/buildUnreadPayload.js'

const PREVIEW_MAX = 100

function previewText(content) {
  if (!content) return ''
  const s = String(content).replace(/\s+/g, ' ').trim()
  return s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX)}…` : s
}

/**
 * Attach last message preview + unread onto club rows (by `serverId`).
 */
export async function attachClubMessageActivity(clubs, userId) {
  const list = Array.isArray(clubs) ? clubs : []
  if (list.length === 0) return list

  const serverIds = [
    ...new Set(
      list
        .map((c) => Number(c.serverId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ]
  if (serverIds.length === 0) {
    return list.map((c) => ({
      ...c,
      lastMessagePreview: null,
      lastMessageAt: null,
      unreadCount: 0,
    }))
  }

  const [lastMsgs, unread] = await Promise.all([
    prisma.discussionMessage.findMany({
      where: { groupId: { in: serverIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      distinct: ['groupId'],
      select: {
        groupId: true,
        content: true,
        createdAt: true,
        sender: { select: { full_name: true } },
      },
    }),
    buildUnreadSocketPayload(userId),
  ])

  const lastByServer = new Map(lastMsgs.map((m) => [m.groupId, m]))
  const unreadByGroup = new Map(
    (unread.byGroup ?? []).map((r) => [r.groupId, r.unreadCount])
  )

  return list.map((club) => {
    const sid = Number(club.serverId)
    const last = Number.isFinite(sid) ? lastByServer.get(sid) : null
    const first = last?.sender?.full_name?.split(/\s+/)[0]
    const body = previewText(last?.content)
    const lastMessagePreview = last
      ? `${first ? `${first}: ` : ''}${body || 'Attachment'}`
      : null

    return {
      ...club,
      lastMessagePreview,
      lastMessageAt: last?.createdAt ?? null,
      unreadCount: Number.isFinite(sid) ? unreadByGroup.get(sid) ?? 0 : 0,
    }
  })
}
