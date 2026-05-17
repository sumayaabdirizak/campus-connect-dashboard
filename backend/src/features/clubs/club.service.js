/**
 * Clubs feature — core service module.
 *
 * Two creation paths:
 *   • Path A (student-initiated): createClubApplication() →
 *       Club row at status=PENDING, no DiscussionGroup yet. Dean later calls
 *       approveClubApplication() to materialise the server.
 *   • Path B (dean-initiated): createClubAsDean() →
 *       Club + DiscussionGroup + #general + system roles + owner + moderators
 *       in a single transaction; status starts APPROVED.
 *
 * Both paths share provisionClubServer() so a club is shaped the same way
 * regardless of who created it.
 *
 * Quota enforcement is layered:
 *   1. App-level transaction with count check (lower latency on the happy path)
 *   2. Partial unique index `club_owner_pending_unique` race-protects the
 *      1-PENDING rule at the DB level (see migration 20260515120000_create_clubs).
 *
 * Notifications use prisma.discussionNotification.* directly here; once the
 * generic notify helper from the plan's X1 task lands, swap to that.
 */

import { prisma } from '../../db/prisma.js';
import { seedClubSystemRoles, CLUB_SYSTEM_ROLE_KEYS } from './seedSystemRoles.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'dean', 'faculty', 'super', 'super-admin',
  'mod', 'moderator', 'system', 'support', 'staff', 'official',
  'create', 'new', 'invite', 'invites', 'requests', 'me', 'mine',
  'recommended', 'pending', 'archive', 'archived', 'banned',
]);

// ─── Errors ─────────────────────────────────────────────────────────────────

export class ClubServiceError extends Error {
  constructor(message, { code, status = 400, details = null } = {}) {
    super(message);
    this.code = code;
    this.statusCode = status;
    this.details = details;
  }
}

// ─── Validation helpers ─────────────────────────────────────────────────────

export function validateSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(s)) {
    throw new ClubServiceError('Slug must be 3-32 chars, lowercase letters/numbers/hyphens.', {
      code: 'CLUB_SLUG_INVALID',
      status: 400,
    });
  }
  if (RESERVED_SLUGS.has(s)) {
    throw new ClubServiceError(`Slug "${s}" is reserved.`, {
      code: 'CLUB_SLUG_RESERVED',
      status: 400,
    });
  }
  return s;
}

function toDiscussionGroupKey(slug) {
  return `club:${slug}`;
}

async function loadQuotaPolicy(tx) {
  const row = await tx.clubQuotaPolicy.findUnique({ where: { id: 1 } });
  // Defaults match the migration's seed; safe fallback if the row is missing.
  return {
    perUserActiveCap: row?.perUserActiveCap ?? 2,
    perUserPendingCap: row?.perUserPendingCap ?? 1,
  };
}

async function assertQuota(tx, ownerId) {
  const policy = await loadQuotaPolicy(tx);

  const [activeCount, pendingCount] = await Promise.all([
    tx.club.count({
      where: { ownerId, status: { in: ['APPROVED', 'SUSPENDED'] } },
    }),
    tx.club.count({
      where: { ownerId, status: 'PENDING' },
    }),
  ]);

  if (pendingCount >= policy.perUserPendingCap) {
    throw new ClubServiceError(
      `You can only have ${policy.perUserPendingCap} pending club application at a time.`,
      { code: 'CLUB_QUOTA_PENDING', status: 409, details: { perUserPendingCap: policy.perUserPendingCap } }
    );
  }
  if (activeCount >= policy.perUserActiveCap) {
    throw new ClubServiceError(
      `You can only own ${policy.perUserActiveCap} clubs at a time.`,
      { code: 'CLUB_QUOTA_ACTIVE', status: 409, details: { perUserActiveCap: policy.perUserActiveCap } }
    );
  }
}

async function attachInterestsIfAny(tx, clubId, tagSlugs) {
  if (!Array.isArray(tagSlugs) || tagSlugs.length === 0) return;
  const tags = await tx.interestTag.findMany({
    where: { slug: { in: tagSlugs.map((s) => String(s).trim().toLowerCase()) } },
    select: { id: true },
  });
  if (tags.length === 0) return;
  await tx.clubInterest.createMany({
    data: tags.map((t) => ({ clubId, tagId: t.id })),
    skipDuplicates: true,
  });
}

// ─── Provisioning helper (shared by both paths) ─────────────────────────────

/**
 * Provision the DiscussionGroup + #general channel + system roles + owner
 * membership for a club. Caller controls the transaction.
 *
 * @param {object} tx — Prisma transaction client
 * @param {object} club — the Club row (must have id, slug, name, ownerId, iconUrl)
 * @returns {Promise<{ serverId: number, defaultChannelId: number, roleIds: object }>}
 */
export async function provisionClubServer(tx, club) {
  if (!club?.id || !club.slug) {
    throw new ClubServiceError('provisionClubServer requires a Club row', {
      code: 'CLUB_PROVISION_INVALID',
      status: 500,
    });
  }

  // Create the backing DiscussionGroup. scopeType=CLUB lets multiple clubs
  // coexist without colliding on the (scopeType, scopeId) unique constraint.
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
      // E2EE off by default for clubs; can be enabled per-club later.
      e2eeEnabled: false,
    },
    select: { id: true },
  });

  // Seed EVERYONE / MEMBER / MODERATOR system roles.
  const roleIds = await seedClubSystemRoles(tx, server.id);

  // Create a #general channel; mirror the FACULTY_SERVER provisioning pattern
  // (one default channel per server, then expandable later via /channels).
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

  // Mark it as the server's default channel.
  await tx.discussionGroup.update({
    where: { id: server.id },
    data: { defaultChannelId: channel.id },
  });

  // Owner membership (only when an owner exists — system-seeded default clubs
  // can have ownerId=null).
  if (club.ownerId) {
    await tx.discussionGroupMembership.upsert({
      where: { groupId_userId: { groupId: server.id, userId: club.ownerId } },
      update: {
        // Use 'DEAN' as the strongest DiscussionMembershipRole enum value
        // for storing owners — the engine resolves OWNER via the
        // DiscussionGroup.ownerId short-circuit anyway.
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

  // Link the club back to its server.
  await tx.club.update({
    where: { id: club.id },
    data: { serverId: server.id, lastActivityAt: new Date() },
  });

  return { serverId: server.id, defaultChannelId: channel.id, roleIds };
}

// ─── Path A: student-initiated application ──────────────────────────────────

/**
 * Create a Club row at status=PENDING. No DiscussionGroup is created until
 * a dean approves.
 *
 * @param {object} args
 * @param {number} args.ownerId
 * @param {string} args.name
 * @param {string} args.slug — auto-derived from name if absent
 * @param {string} [args.tagline]
 * @param {string} [args.description]
 * @param {string} [args.rules]
 * @param {string} [args.iconUrl]
 * @param {string} [args.bannerUrl]
 * @param {string} [args.themeColor]
 * @param {string} [args.joinPolicy=BY_REQUEST]
 * @param {string} [args.scopeKind=FACULTY]
 * @param {number} [args.facultyId] — required when scopeKind=FACULTY
 * @param {string[]} [args.interestTagSlugs]
 * @returns {Promise<object>} the inserted Club row
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
      // Map Prisma unique-violation codes to a clean API error.
      if (err?.code === 'P2002') {
        const target = String(err?.meta?.target ?? '');
        if (target.includes('slug')) {
          throw new ClubServiceError(`Slug "${slug}" is already taken.`, {
            code: 'CLUB_SLUG_TAKEN',
            status: 409,
          });
        }
        // club_owner_pending_unique partial index
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

// ─── Approval / rejection (Path A final step) ───────────────────────────────

/**
 * Approve a pending club application. Materialises the DiscussionGroup,
 * inserts owner membership, flips Club.status to APPROVED, writes audit row,
 * and notifies the applicant.
 *
 * @param {number} clubId
 * @param {number} actorUserId — the approving dean / super-admin
 * @returns {Promise<{ club: object, serverId: number, defaultChannelId: number }>}
 */
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

// ─── Path B: dean-initiated direct create ───────────────────────────────────

/**
 * Dean / super-admin creates a club directly — no approval gate. Assigns
 * moderators in the same transaction.
 *
 * @param {object} args — same shape as createClubApplication, plus:
 * @param {number[]} [args.moderatorUserIds] — promoted to MODERATOR at creation
 * @returns {Promise<{ club: object, serverId: number, defaultChannelId: number }>}
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
    // Quota check still applies — even a dean shouldn't own unlimited clubs.
    // Comment out if product wants deans exempt.
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

    // Insert moderator memberships. We use the DiscussionMembershipRole enum
    // value 'ADMIN' as the storage proxy for MODERATOR — the engine maps
    // membership.role → systemKey 'MODERATOR' for club servers (see
    // `permissions.js` USER_SERVER branch). Schema enum currently has no
    // MODERATOR value; if you want one, add it to DiscussionMembershipRole
    // and adjust the engine mapping accordingly.
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

// ─── Read helpers (used by the controller in Phase 1) ───────────────────────

export async function getClubBySlug(slug, { includePending = false, viewerUserId = null } = {}) {
  const club = await prisma.club.findUnique({
    where: { slug: String(slug).trim().toLowerCase() },
    include: {
      faculty: true,
      owner: { select: { id: true, full_name: true } },
      interests: { include: { tag: true } },
    },
  });
  if (!club) return null;
  if (!includePending && club.status === 'PENDING' && club.ownerId !== viewerUserId) {
    return null;
  }
  return club;
}

export async function listClubsForUser(userId) {
  // Owned, plus member-of via the club server's membership row.
  const [owned, memberships] = await Promise.all([
    prisma.club.findMany({
      where: { ownerId: userId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.club.findMany({
      where: {
        status: 'APPROVED',
        serverId: { not: null },
        server: {
          memberships: {
            some: { userId, leftAt: null, isActive: true },
          },
        },
        ownerId: { not: userId },
      },
      include: {
        server: {
          select: {
            memberships: {
              where: { userId, leftAt: null, isActive: true },
              select: { role: true },
            },
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    }),
  ]);

  // Enrich memberOf with membership role
  const memberOf = memberships.map((club) => ({
    ...club,
    membershipRole: club.server?.memberships?.[0]?.role || 'MEMBER',
  }));

  return { owned, memberOf, moderating: memberOf.filter((c) => c.membershipRole === 'MODERATOR') };
}
