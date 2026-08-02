import { seedClubSystemRoles } from '../seedSystemRoles.js';
import { ClubServiceError } from './errors.js';

function toDiscussionGroupKey(slug) {
  return `club:${slug}`;
}

/**
 * Provision the DiscussionGroup + #general channel + system roles + owner
 * membership for a club. Caller controls the transaction.
 */
export async function provisionClubServer(tx, club) {
  if (!club?.id || !club.slug) {
    throw new ClubServiceError('provisionClubServer requires a Club row', {
      code: 'CLUB_PROVISION_INVALID',
      status: 500,
    });
  }

  const server = await tx.discussionGroup.create({
    data: {
      scopeType: 'CLUB',
      scopeId: club.id,
      groupKey: toDiscussionGroupKey(club.slug),
      name: club.name,
      status: 'ACTIVE',
      kind: 'USER_SERVER',
      ownerId: club.ownerId ?? null,
      iconUrl: club.iconUrl ?? null,
      description: club.tagline ?? null,
      e2eeEnabled: false,
    },
    select: { id: true },
  });

  const roleIds = await seedClubSystemRoles(tx, server.id);

  const channel = await tx.discussionChannel.create({
    data: {
      serverId: server.id,
      name: 'general',
      slug: 'general',
      kind: 'TEXT',
      position: 0,
      isPrivate: false,
    },
    select: { id: true },
  });

  await tx.discussionGroup.update({
    where: { id: server.id },
    data: { defaultChannelId: channel.id },
  });

  if (club.ownerId) {
    await tx.discussionGroupMembership.upsert({
      where: { groupId_userId: { groupId: server.id, userId: club.ownerId } },
      update: {
        role: 'DEAN',
        canPost: true,
        canModerate: true,
        leftAt: null,
        isActive: true,
      },
      create: {
        groupId: server.id,
        userId: club.ownerId,
        role: 'DEAN',
        canPost: true,
        canModerate: true,
      },
    });
  }

  await tx.club.update({
    where: { id: club.id },
    data: { serverId: server.id, lastActivityAt: new Date() },
  });

  return { serverId: server.id, defaultChannelId: channel.id, roleIds };
}
