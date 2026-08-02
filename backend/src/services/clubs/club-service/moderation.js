import { prisma } from '../../../db/prisma.js';
import { ClubServiceError } from './errors.js';
import { provisionClubServer } from './provision.js';

export async function approveClubApplication(clubId, actorUserId) {
  if (!Number.isInteger(clubId)) {
    throw new ClubServiceError('Invalid clubId', { code: 'CLUB_NOT_FOUND', status: 404 });
  }

  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({ where: { id: clubId } });
    if (!club) throw new ClubServiceError('Club not found', { code: 'CLUB_NOT_FOUND', status: 404 });
    if (club.status !== 'PENDING') {
      throw new ClubServiceError(
        `Cannot approve club in state ${club.status}.`,
        { code: 'CLUB_NOT_PENDING', status: 409 }
      );
    }

    const provisioned = await provisionClubServer(tx, club);

    const updated = await tx.club.update({
      where: { id: clubId },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedByUserId: actorUserId ?? null,
      },
    });

    await tx.clubModerationAudit.create({
      data: {
        clubId,
        actorUserId: actorUserId ?? null,
        action: 'APPROVE',
        payload: { serverId: provisioned.serverId },
      },
    });

    if (club.ownerId) {
      await tx.discussionNotification.create({
        data: {
          userId: club.ownerId,
          groupId: provisioned.serverId,
          type: 'CLUB_APPROVED',
          payload: {
            clubId,
            slug: club.slug,
            serverId: provisioned.serverId,
            defaultChannelId: provisioned.defaultChannelId,
          },
        },
      });
    }

    return { club: updated, ...provisioned };
  });
}

export async function rejectClubApplication(clubId, actorUserId, reason) {
  if (!Number.isInteger(clubId)) {
    throw new ClubServiceError('Invalid clubId', { code: 'CLUB_NOT_FOUND', status: 404 });
  }
  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({ where: { id: clubId } });
    if (!club) throw new ClubServiceError('Club not found', { code: 'CLUB_NOT_FOUND', status: 404 });
    if (club.status !== 'PENDING') {
      throw new ClubServiceError(`Cannot reject club in state ${club.status}.`, {
        code: 'CLUB_NOT_PENDING',
        status: 409,
      });
    }

    const updated = await tx.club.update({
      where: { id: clubId },
      data: {
        status: 'REJECTED',
        decidedAt: new Date(),
        decidedByUserId: actorUserId ?? null,
      },
    });

    await tx.clubModerationAudit.create({
      data: {
        clubId,
        actorUserId: actorUserId ?? null,
        action: 'REJECT',
        reason: reason ?? null,
      },
    });

    if (club.ownerId) {
      await tx.discussionNotification.create({
        data: {
          userId: club.ownerId,
          type: 'CLUB_REJECTED',
          payload: { clubId, slug: club.slug, reason: reason ?? null },
        },
      });
    }

    return updated;
  });
}
