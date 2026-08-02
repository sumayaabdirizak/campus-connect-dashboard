import { prisma } from '../../db/prisma.js'

/**
 * Map discussion group id → club display fields for inbox typing.
 */
export async function loadClubMetaByServerIds(serverIds) {
  const ids = [...new Set((serverIds ?? []).map(Number).filter((id) => id > 0))]
  if (ids.length === 0) return new Map()

  const clubs = await prisma.club.findMany({
    where: { serverId: { in: ids }, status: 'APPROVED' },
    select: {
      serverId: true,
      slug: true,
      name: true,
      iconUrl: true,
    },
  })

  return new Map(
    clubs
      .filter((c) => c.serverId != null)
      .map((c) => [
        c.serverId,
        { slug: c.slug, name: c.name, iconUrl: c.iconUrl ?? null },
      ])
  )
}

/**
 * Clubs the user owns or belongs to, as DiscussionGroup-shaped rows.
 */
export async function loadClubServersForUser(userId) {
  const uid = Number(userId)
  if (!Number.isFinite(uid) || uid <= 0) return []

  const clubs = await prisma.club.findMany({
    where: {
      status: 'APPROVED',
      serverId: { not: null },
      OR: [
        { ownerId: uid },
        {
          server: {
            memberships: {
              some: { userId: uid, leftAt: null, isActive: true },
            },
          },
        },
      ],
    },
    select: {
      name: true,
      iconUrl: true,
      server: {
        select: {
          id: true,
          name: true,
          iconUrl: true,
          kind: true,
          scopeType: true,
          defaultChannelId: true,
          parentServerId: true,
          status: true,
        },
      },
    },
  })

  return clubs
    .filter((c) => c.server && c.server.status === 'ACTIVE')
    .map((c) => ({
      id: c.server.id,
      name: c.name || c.server.name,
      iconUrl: c.iconUrl || c.server.iconUrl || null,
      kind: 'USER_SERVER',
      scopeType: 'CLUB',
      defaultChannelId: c.server.defaultChannelId,
      parentServerId: c.server.parentServerId,
    }))
}
