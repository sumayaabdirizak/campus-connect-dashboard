import { prisma } from '../../../db/prisma.js';
import { attachInterestsIfAny } from './interests.js';
import { assertQuota } from './quota.js';
import { ClubServiceError } from './errors.js';
import { validateSlug } from './slug-validation.js';

/**
 * Create a Club row at status=PENDING. No DiscussionGroup is created until
 * a dean approves.
 */
export async function createClubApplication(args) {
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
  if (!['FACULTY', 'UNIVERSITY', 'CROSS'].includes(scopeKind)) {
    throw new ClubServiceError('Invalid scopeKind.', { code: 'CLUB_SCOPE_INVALID', status: 400 });
  }
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
  if (!['OPEN', 'BY_REQUEST', 'INVITE_ONLY'].includes(joinPolicy)) {
    throw new ClubServiceError('Invalid joinPolicy.', { code: 'CLUB_POLICY_INVALID', status: 400 });
  }

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
          status: 'PENDING',
          joinPolicy,
          scopeKind,
          facultyId,
          ownerId,
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
        throw new ClubServiceError(
          'You already have a pending club application.',
          { code: 'CLUB_QUOTA_PENDING', status: 409 }
        );
      }
      throw err;
    }

    await attachInterestsIfAny(tx, club.id, args?.interestTagSlugs);

    await tx.clubModerationAudit.create({
      data: {
        clubId: club.id,
        actorUserId: ownerId,
        action: 'CREATE',
        payload: { path: 'A', scopeKind, joinPolicy },
      },
    });

    return club;
  });
}
