import { prisma } from '../../../db/prisma.js';
import { attachInterestsIfAny } from './interests.js';
import { assertQuota } from './quota.js';
import { ClubServiceError } from './errors.js';
import { provisionClubServer } from './provision.js';
import { validateSlug } from './slug-validation.js';

/**
 * Dean / super-admin creates a club directly — no approval gate. Assigns
 * moderators in the same transaction.
 */
export async function createClubAsDean(args) {
  const ownerId = Number(args?.ownerId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new ClubServiceError('ownerId is required', { code: 'CLUB_OWNER_MISSING', status: 401 });
  }

  const name = String(args?.name ?? '').trim();
  if (name.length < 3 || name.length > 80) {
    throw new ClubServiceError('Name must be 3-80 chars.', { code: 'CLUB_NAME_INVALID', status: 400 });
  }
  const slug = validateSlug(args?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  const scopeKind = args?.scopeKind || 'FACULTY';
  let facultyId = null;
  if (scopeKind === 'FACULTY') {
    facultyId = Number(args?.facultyId);
    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      throw new ClubServiceError('facultyId is required for FACULTY scope.', {
        code: 'CLUB_FACULTY_MISSING',
        status: 400,
      });
    }
  }

  const joinPolicy = args?.joinPolicy || 'BY_REQUEST';
  const moderatorUserIds = Array.isArray(args?.moderatorUserIds)
    ? args.moderatorUserIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0 && n !== ownerId)
    : [];

  return prisma.$transaction(async (tx) => {
    await assertQuota(tx, ownerId);

    let club;
    try {
      club = await tx.club.create({
        data: {
          slug,
          name,
          tagline: args?.tagline ?? null,
          description: args?.description ?? null,
          rules: args?.rules ?? null,
          iconUrl: args?.iconUrl ?? null,
          bannerUrl: args?.bannerUrl ?? null,
          themeColor: args?.themeColor ?? null,
          status: 'APPROVED',
          joinPolicy,
          scopeKind,
          facultyId,
          ownerId,
          decidedAt: new Date(),
          decidedByUserId: ownerId,
        },
      });
    } catch (err) {
      if (err?.code === 'P2002') {
        const target = String(err?.meta?.target ?? '');
        if (target.includes('slug')) {
          throw new ClubServiceError(`Slug "${slug}" is already taken.`, {
            code: 'CLUB_SLUG_TAKEN',
            status: 409,
          });
        }
      }
      throw err;
    }

    await attachInterestsIfAny(tx, club.id, args?.interestTagSlugs);

    const provisioned = await provisionClubServer(tx, club);

    for (const userId of moderatorUserIds) {
      await tx.discussionGroupMembership.upsert({
        where: {
          groupId_userId: { groupId: provisioned.serverId, userId },
        },
        update: {
          role: 'ADMIN',
          canPost: true,
          canModerate: true,
          leftAt: null,
          isActive: true,
        },
        create: {
          groupId: provisioned.serverId,
          userId,
          role: 'ADMIN',
          canPost: true,
          canModerate: true,
        },
      });
      await tx.discussionNotification.create({
        data: {
          userId,
          groupId: provisioned.serverId,
          type: 'CLUB_PROMOTED',
          payload: { clubId: club.id, slug: club.slug, role: 'MODERATOR' },
        },
      });
    }

    await tx.clubModerationAudit.create({
      data: {
        clubId: club.id,
        actorUserId: ownerId,
        action: 'CREATE',
        payload: {
          path: 'B',
          scopeKind,
          joinPolicy,
          moderatorUserIds,
          serverId: provisioned.serverId,
        },
      },
    });

    return { club, ...provisioned };
  });
}
