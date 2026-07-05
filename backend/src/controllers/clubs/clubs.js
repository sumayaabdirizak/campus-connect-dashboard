/**
 * Clubs REST controller — Phase 1 endpoints.
 *
 * Mounts at /api/clubs in app.js. All routes are behind the global auth gate.
 *
 * Endpoints:
 *   GET    /                 — discovery (cursor-paginated, filters, sorting)
 *   GET    /mine             — clubs the authenticated user owns or belongs to
 *   GET    /recommended      — interest-based recommendations
 *   GET    /my-interests     — get current user's interest tags
 *   PUT    /my-interests     — replace current user's interest tags
 *   GET    /:slug            — single club detail
 *   POST   /                 — Path A (student apply) or Path B (dean create, ?as=dean)
 *   POST   /:id/approve      — dean approves a PENDING club
 *   POST   /:id/reject       — dean rejects a PENDING club
 *   POST   /:id/suspend      — dean suspends a club
 *   POST   /:id/join         — join an OPEN club or request to join BY_REQUEST
 *   POST   /:id/leave        — self-leave
 *   GET    /:id/members      — list club members
 *   PATCH  /:id              — edit club (owner / moderator)
 *   GET    /dean/pending     — dean approval queue
 *   POST   /:id/members/:userId/promote   — owner promotes → MODERATOR
 *   POST   /:id/members/:userId/demote    — owner demotes → MEMBER
 *   DELETE /:id/members/:userId           — kick member
 */

import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';
import {
  createClubApplication,
  approveClubApplication,
  rejectClubApplication,
  createClubAsDean,
  getClubBySlug,
  listClubsForUser,
  ClubServiceError,
} from '../../features/clubs/club.service.js';
import { requireDean } from '../../middleware/requireDean.js';
import { requireRole } from '../../middleware/requireRole.js';
import { getIo } from '../../socket/hub.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userId(req) {
  return Number(req.user?.id ?? req.user?.sub);
}

function handleServiceError(err, res) {
  if (err instanceof ClubServiceError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }
  throw err;
}

// ─── Validation schemas ──────────────────────────────────────────────────────

const createClubSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().min(3).max(32).optional(),
  tagline: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  rules: z.string().trim().max(4000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #1a2b3c')
    .optional()
    .nullable(),
  joinPolicy: z.enum(['OPEN', 'BY_REQUEST', 'INVITE_ONLY']).default('BY_REQUEST'),
  scopeKind: z.enum(['FACULTY', 'UNIVERSITY', 'CROSS']).default('FACULTY'),
  facultyId: z.number().int().positive().optional().nullable(),
  interestTagSlugs: z.array(z.string().trim()).max(10).optional(),
  // Path B only
  moderatorUserIds: z.array(z.number().int().positive()).max(20).optional(),
});

const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

const editClubSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  tagline: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  rules: z.string().trim().max(4000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  joinPolicy: z.enum(['OPEN', 'BY_REQUEST', 'INVITE_ONLY']).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs — discovery page
// ═════════════════════════════════════════════════════════════════════════════

router.get('/', async (req, res, next) => {
  try {
    const {
      scope,        // FACULTY | UNIVERSITY | CROSS
      facultyId,    // filter to a specific faculty
      interest,     // comma-separated tag slugs
      q,            // text search (name / tagline)
      sort = 'popular',  // new | popular | active
      cursor,       // last-seen club ID for keyset pagination
      limit = '20',
    } = req.query;

    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const where = { status: 'APPROVED' };
    if (scope) where.scopeKind = String(scope).toUpperCase();
    if (facultyId) where.facultyId = Number(facultyId);

    if (interest) {
      const slugs = String(interest).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (slugs.length > 0) {
        where.interests = { some: { tag: { slug: { in: slugs } } } };
      }
    }

    if (q) {
      const term = String(q).trim();
      if (term.length >= 2) {
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { tagline: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    // Sorting
    let orderBy;
    switch (sort) {
      case 'new':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'active':
        orderBy = [{ lastActivityAt: 'desc' }];
        break;
      case 'popular':
      default:
        orderBy = [{ memberCountCache: 'desc' }, { createdAt: 'desc' }];
    }

    // Cursor-based pagination
    const findArgs = {
      where,
      orderBy,
      take: take + 1, // fetch one extra to know if there's a next page
      include: {
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { slug: true, label: true } } } },
        _count: { select: { joinRequests: { where: { status: 'PENDING' } } } },
      },
    };
    if (cursor) {
      findArgs.cursor = { id: Number(cursor) };
      findArgs.skip = 1; // skip the cursor row itself
    }

    const clubs = await prisma.club.findMany(findArgs);
    const hasMore = clubs.length > take;
    if (hasMore) clubs.pop();

    const nextCursor = hasMore ? clubs[clubs.length - 1]?.id : null;

    res.json({
      clubs: clubs.map(formatClubForApi),
      nextCursor,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/mine — my clubs
// ═════════════════════════════════════════════════════════════════════════════

router.get('/mine', async (req, res, next) => {
  try {
    const uid = userId(req);
    const result = await listClubsForUser(uid);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/recommended — interest-based recommendations
// ═════════════════════════════════════════════════════════════════════════════

router.get('/recommended', async (req, res, next) => {
  try {
    const uid = userId(req);
    const take = Math.min(Number(req.query.limit) || 10, 20);

    // 1. Get user's interest tags
    const userInterests = await prisma.userInterest.findMany({
      where: { userId: uid },
      select: { tagId: true },
    });
    const userTagIds = userInterests.map((ui) => ui.tagId);

    // 2. Get servers the user is already a member of (to exclude)
    const myServerIds = (
      await prisma.discussionGroupMembership.findMany({
        where: { userId: uid, leftAt: null, isActive: true },
        select: { groupId: true },
      })
    ).map((m) => m.groupId);

    // 3. Fetch candidate clubs (approved, not joined)
    const clubs = await prisma.club.findMany({
      where: {
        status: 'APPROVED',
        ...(myServerIds.length > 0 ? { serverId: { notIn: myServerIds } } : {}),
      },
      orderBy: [{ memberCountCache: 'desc' }],
      take: take * 3, // over-fetch to rank
      include: {
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { id: true, slug: true, label: true } } } },
      },
    });

    // 4. Score: tag-intersection overlap + member-count tiebreaker
    const scored = clubs.map((club) => {
      const clubTagIds = club.interests.map((ci) => ci.tag.id);
      const overlap = userTagIds.length > 0
        ? clubTagIds.filter((tid) => userTagIds.includes(tid)).length
        : 0;
      // Normalize member count to 0..1 range for tiebreaker (max 10000 assumed)
      const popScore = Math.min(club.memberCountCache / 10000, 1);
      return { club, score: overlap * 10 + popScore };
    });

    // 5. Sort by score desc, then slice
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, take).map((s) => s.club);

    res.json({ clubs: top.map(formatClubForApi) });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/dean/stats — faculty club counts grouped by status
// ═════════════════════════════════════════════════════════════════════════════

router.get('/dean/stats', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const facultyFilter = req.user.role !== 'SUPER_ADMIN' && req.facultyId
      ? { facultyId: req.facultyId }
      : {};

    const [approved, pending, suspended, rejected] = await Promise.all([
      prisma.club.count({ where: { ...facultyFilter, status: 'APPROVED' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'PENDING' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'SUSPENDED' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'REJECTED' } }),
    ]);

    res.json({ approved, pending, suspended, rejected, total: approved + pending + suspended + rejected });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/dean/all — all faculty clubs (any status), optional ?status=
// ═════════════════════════════════════════════════════════════════════════════

router.get('/dean/all', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const facultyFilter = req.user.role !== 'SUPER_ADMIN' && req.facultyId
      ? { facultyId: req.facultyId } : {};
    const statusFilter = status ? { status: String(status).toUpperCase() } : {};

    const clubs = await prisma.club.findMany({
      where: { ...facultyFilter, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { slug: true, label: true } } } },
        _count: { select: { members: true } },
      },
    });

    res.json({ clubs });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/dean/pending — dean approval queue
// ═════════════════════════════════════════════════════════════════════════════

router.get('/dean/pending', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const where = { status: 'PENDING' };

    // Scope to dean's faculty unless super-admin
    if (req.user.role !== 'SUPER_ADMIN' && req.facultyId) {
      where.facultyId = req.facultyId;
    }

    const clubs = await prisma.club.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { slug: true, label: true } } } },
      },
    });

    res.json({ clubs });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:slug — single club detail
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug).trim().toLowerCase();
    const uid = userId(req);

    const club = await getClubBySlug(slug, {
      includePending: true,
      viewerUserId: uid,
    });
    if (!club) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Check if the viewer is a member
    let membership = null;
    if (club.serverId) {
      membership = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true },
        select: { role: true },
      });
    }

    res.json({
      club: formatClubForApi(club),
      isMember: !!membership,
      isOwner: club.ownerId === uid,
      membershipRole: membership?.role ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs — Path A (student) or Path B (dean, with ?as=dean)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/', async (req, res, next) => {
  try {
    const uid = userId(req);
    const parsed = createClubSchema.parse(req.body);
    const isDeanMode = req.query.as === 'dean';

    if (isDeanMode) {
      // Path B — dean / super-admin direct create
      if (!['DEAN', 'SUPER_ADMIN'].includes(req.user.role)) {
        return res.status(403).json(apiErrorBody('Only deans and super-admins can create clubs directly'));
      }

      // If dean, resolve their faculty
      let deanFacultyId = parsed.facultyId;
      if (req.user.role === 'DEAN') {
        const deanProfile = await prisma.deanProfile.findUnique({
          where: { userId: uid },
          select: { facultyId: true },
        });
        if (!deanProfile) {
          return res.status(403).json(apiErrorBody('No faculty assignment found for this Dean'));
        }
        // Dean can only create clubs in their own faculty
        if (parsed.scopeKind === 'FACULTY') {
          deanFacultyId = deanProfile.facultyId;
        }
      }

      const result = await createClubAsDean({
        ...parsed,
        ownerId: uid,
        facultyId: deanFacultyId,
      });

      return res.status(201).json({
        club: result.club,
        serverId: result.serverId,
        defaultChannelId: result.defaultChannelId,
      });
    }

    // Path A — student application
    // Auto-resolve student's faculty if not provided
    let facultyId = parsed.facultyId;
    if (parsed.scopeKind === 'FACULTY' && !facultyId) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: uid },
        select: { facultyId: true },
      });
      if (studentProfile?.facultyId) {
        facultyId = studentProfile.facultyId;
      }
    }

    const club = await createClubApplication({
      ...parsed,
      ownerId: uid,
      facultyId,
    });

    res.status(201).json({ club });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/approve — dean approves pending club
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/approve', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    // Scope check: dean can only approve clubs in their faculty
    if (req.user.role === 'DEAN' && req.facultyId) {
      const club = await prisma.club.findUnique({ where: { id: clubId }, select: { facultyId: true } });
      if (!club) return res.status(404).json(apiErrorBody('Club not found'));
      if (club.facultyId !== req.facultyId) {
        return res.status(403).json(apiErrorBody('Club is not in your faculty'));
      }
    }

    const result = await approveClubApplication(clubId, uid);

    // Notify via socket if the owner is online
    if (result.club.ownerId) {
      try {
        const io = getIo();
        io.to(`user:${result.club.ownerId}`).emit('club:approved', {
          clubId: result.club.id,
          slug: result.club.slug,
          serverId: result.serverId,
          defaultChannelId: result.defaultChannelId,
        });
      } catch { /* socket unavailable, notification was persisted anyway */ }
    }

    res.json({
      club: result.club,
      serverId: result.serverId,
      defaultChannelId: result.defaultChannelId,
    });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/reject — dean rejects pending club
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/reject', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const { reason } = rejectSchema.parse(req.body);

    // Scope check
    if (req.user.role === 'DEAN' && req.facultyId) {
      const club = await prisma.club.findUnique({ where: { id: clubId }, select: { facultyId: true } });
      if (!club) return res.status(404).json(apiErrorBody('Club not found'));
      if (club.facultyId !== req.facultyId) {
        return res.status(403).json(apiErrorBody('Club is not in your faculty'));
      }
    }

    const club = await rejectClubApplication(clubId, uid, reason);
    res.json({ club });
  } catch (err) {
    try { handleServiceError(err, res); } catch { next(err); }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/suspend — dean suspends a club
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/suspend', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.status !== 'APPROVED') {
      return res.status(409).json(apiErrorBody(`Cannot suspend club in state ${club.status}`));
    }

    // Scope check for deans
    if (req.user.role === 'DEAN' && req.facultyId && club.facultyId !== req.facultyId) {
      return res.status(403).json(apiErrorBody('Club is not in your faculty'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({
        where: { id: clubId },
        data: { status: 'SUSPENDED' },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'SUSPEND',
          reason: req.body?.reason ?? null,
        },
      });
      return result;
    });

    res.json({ club: updated });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/join — join (OPEN) or request to join (BY_REQUEST)
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/join', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, status: true, serverId: true, joinPolicy: true, ownerId: true, slug: true },
    });
    if (!club || club.status !== 'APPROVED') {
      return res.status(404).json(apiErrorBody('Club not found or not available'));
    }
    if (!club.serverId) {
      return res.status(409).json(apiErrorBody('Club server not provisioned'));
    }

    // Already a member?
    const existing = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Already a member', code: 'CLUB_ALREADY_MEMBER' });
    }

    if (club.joinPolicy === 'INVITE_ONLY') {
      return res.status(403).json({ error: 'This club is invite-only', code: 'CLUB_INVITE_ONLY' });
    }

    if (club.joinPolicy === 'BY_REQUEST') {
      // Check if they already have a pending request
      const pendingReq = await prisma.clubJoinRequest.findFirst({
        where: { clubId, userId: uid, status: 'PENDING' },
      });
      if (pendingReq) {
        return res.status(409).json({ error: 'Request already pending', code: 'CLUB_REQUEST_PENDING' });
      }

      const joinRequest = await prisma.$transaction(async (tx) => {
        const jr = await tx.clubJoinRequest.create({
          data: { clubId, userId: uid },
        });

        // Notify owner + moderators
        const modsAndOwner = await tx.discussionGroupMembership.findMany({
          where: {
            groupId: club.serverId,
            leftAt: null,
            isActive: true,
            OR: [
              { userId: club.ownerId ?? -1 },
              { role: 'ADMIN' }, // ADMIN = moderator storage proxy
            ],
          },
          select: { userId: true },
        });

        if (modsAndOwner.length > 0) {
          await tx.discussionNotification.createMany({
            data: modsAndOwner.map((m) => ({
              userId: m.userId,
              groupId: club.serverId,
              type: 'CLUB_JOIN_REQUEST',
              payload: { clubId, requestId: jr.id, applicantUserId: uid },
            })),
          });
        }

        return jr;
      });

      return res.status(201).json({ joinRequest, status: 'PENDING' });
    }

    // OPEN — join immediately
    const result = await prisma.$transaction(async (tx) => {
      // Use 'STUDENT' as the default membership role for new club members.
      // The engine maps STUDENT → MEMBER systemKey for club servers.
      const membership = await tx.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: club.serverId, userId: uid } },
        update: {
          role: 'STUDENT',
          canPost: true,
          leftAt: null,
          isActive: true,
        },
        create: {
          groupId: club.serverId,
          userId: uid,
          role: 'STUDENT',
          canPost: true,
        },
      });

      // Bump member count cache
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { increment: 1 } },
      });

      return membership;
    });

    // Emit socket event for real-time rail update
    try {
      const io = getIo();
      io.to(`user:${uid}`).emit('club:joined', {
        clubId,
        slug: club.slug,
        serverId: club.serverId,
      });
    } catch { /* socket unavailable */ }

    res.status(201).json({ membership: result, status: 'JOINED' });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/leave — self-leave
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/leave', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Owner must transfer ownership first
    if (club.ownerId === uid) {
      return res.status(409).json({
        error: 'Club owner must transfer ownership before leaving',
        code: 'CLUB_OWNER_CANNOT_LEAVE',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.updateMany({
        where: { groupId: club.serverId, userId: uid, leftAt: null },
        data: { leftAt: new Date(), isActive: false },
      });
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { decrement: 1 } },
      });
    });

    res.json({ left: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:id/members — list members
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/members', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    const members = await prisma.discussionGroupMembership.findMany({
      where: { groupId: club.serverId, leftAt: null, isActive: true },
      include: {
        user: { select: { id: true, full_name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      members: members.map((m) => ({
        userId: m.userId,
        user: m.user,
        role: m.role,
        clubRole: m.userId === club.ownerId ? 'OWNER'
          : m.role === 'ADMIN' ? 'MODERATOR'
          : 'MEMBER',
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:id/requests — list pending join requests (owner / moderator)
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/requests', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Check caller is owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) {
        return res.status(403).json(apiErrorBody('Only club owner or moderators can view requests'));
      }
    }

    const requests = await prisma.clubJoinRequest.findMany({
      where: { clubId, status: 'PENDING' },
      include: {
        user: { select: { id: true, full_name: true, email: true, avatarUrl: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/requests/:reqId/decide — approve or reject a join request
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/requests/:reqId/decide', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const reqId = Number(req.params.reqId);
    const uid = userId(req);
    const approve = req.body?.approve === true;
    const reason = req.body?.reason ?? null;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true, slug: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Only owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const joinReq = await prisma.clubJoinRequest.findFirst({
      where: { id: reqId, clubId, status: 'PENDING' },
    });
    if (!joinReq) {
      return res.status(404).json(apiErrorBody('Join request not found or already decided'));
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.clubJoinRequest.update({
        where: { id: reqId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          decidedAt: new Date(),
          decidedByUserId: uid,
          reason,
        },
      });

      if (approve) {
        // Insert membership
        await tx.discussionGroupMembership.upsert({
          where: { groupId_userId: { groupId: club.serverId, userId: joinReq.userId } },
          update: { role: 'STUDENT', canPost: true, leftAt: null, isActive: true },
          create: { groupId: club.serverId, userId: joinReq.userId, role: 'STUDENT', canPost: true },
        });
        await tx.club.update({
          where: { id: clubId },
          data: { memberCountCache: { increment: 1 } },
        });
      }

      // Notify applicant
      await tx.discussionNotification.create({
        data: {
          userId: joinReq.userId,
          groupId: club.serverId,
          type: 'CLUB_JOIN_DECIDED',
          payload: { clubId, slug: club.slug, approved: approve, reason },
        },
      });

      return updated;
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${joinReq.userId}`).emit(approve ? 'club:joined' : 'club:join-rejected', {
        clubId,
        slug: club.slug,
        serverId: club.serverId,
      });
    } catch { /* socket unavailable */ }

    res.json({ request: result });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/clubs/:id — edit club settings (owner or moderator, limited)
// ═════════════════════════════════════════════════════════════════════════════

router.patch('/:id', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const data = editClubSchema.parse(req.body);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true },
    });
    if (!club) return res.status(404).json(apiErrorBody('Club not found'));

    // Only owner can change joinPolicy. Moderators can edit name/tagline/rules/etc.
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
      // Moderators cannot change joinPolicy
      delete data.joinPolicy;
    }

    // Filter out undefined values
    const updateData = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) updateData[key] = val;
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(apiErrorBody('No fields to update'));
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.club.update({ where: { id: clubId }, data: updateData });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'EDIT',
          payload: { fields: Object.keys(updateData) },
        },
      });
      // Sync name to DiscussionGroup if changed
      if (updateData.name && club.serverId) {
        await tx.discussionGroup.update({
          where: { id: club.serverId },
          data: { name: updateData.name },
        });
      }
      return result;
    });

    res.json({ club: updated });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/members/:userId/promote — promote → MODERATOR
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/members/:userId/promote', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true, slug: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.ownerId !== uid) {
      return res.status(403).json(apiErrorBody('Only the club owner can promote members'));
    }

    const targetMem = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
    });
    if (!targetMem) return res.status(404).json(apiErrorBody('User is not a member'));
    if (targetMem.role === 'ADMIN') {
      return res.status(409).json(apiErrorBody('User is already a moderator'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.update({
        where: { id: targetMem.id },
        data: { role: 'ADMIN', canModerate: true },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'PROMOTE',
          payload: { targetUserId, from: targetMem.role, to: 'MODERATOR' },
        },
      });
      await tx.discussionNotification.create({
        data: {
          userId: targetUserId,
          groupId: club.serverId,
          type: 'CLUB_PROMOTED',
          payload: { clubId, slug: club.slug, role: 'MODERATOR' },
        },
      });
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${targetUserId}`).emit('club:promoted', {
        clubId,
        slug: club.slug,
        role: 'MODERATOR',
      });
    } catch { /* socket unavailable */ }

    res.json({ promoted: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/members/:userId/demote — demote → MEMBER
// ═════════════════════════════════════════════════════════════════════════════

router.post('/:id/members/:userId/demote', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));
    if (club.ownerId !== uid) {
      return res.status(403).json(apiErrorBody('Only the club owner can demote moderators'));
    }
    if (targetUserId === uid) {
      return res.status(409).json(apiErrorBody('Owner cannot demote themselves'));
    }

    const targetMem = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
    });
    if (!targetMem) return res.status(404).json(apiErrorBody('User is not a member'));
    if (targetMem.role !== 'ADMIN') {
      return res.status(409).json(apiErrorBody('User is not a moderator'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.update({
        where: { id: targetMem.id },
        data: { role: 'STUDENT', canModerate: false },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'DEMOTE',
          payload: { targetUserId },
        },
      });
    });

    res.json({ demoted: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/clubs/:id/members/:userId — kick member
// ═════════════════════════════════════════════════════════════════════════════

router.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) return res.status(404).json(apiErrorBody('Club not found'));

    // Owner can kick anyone. Moderators can kick non-moderators.
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const callerMem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!callerMem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    // Cannot kick the owner
    if (targetUserId === club.ownerId) {
      return res.status(403).json(apiErrorBody('Cannot kick the club owner'));
    }

    // Non-owner moderators cannot kick other moderators
    if (!isOwner) {
      const targetMem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: targetUserId, leftAt: null, isActive: true },
        select: { role: true },
      });
      if (targetMem?.role === 'ADMIN') {
        return res.status(403).json(apiErrorBody('Moderators cannot kick other moderators'));
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.discussionGroupMembership.updateMany({
        where: { groupId: club.serverId, userId: targetUserId, leftAt: null },
        data: { leftAt: new Date(), isActive: false },
      });
      await tx.club.update({
        where: { id: clubId },
        data: { memberCountCache: { decrement: 1 } },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'REMOVE_MEMBER',
          payload: { targetUserId },
        },
      });
      await tx.discussionNotification.create({
        data: {
          userId: targetUserId,
          groupId: club.serverId,
          type: 'CLUB_REMOVED',
          payload: { clubId },
        },
      });
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${targetUserId}`).emit('club:removed', { clubId });
    } catch { /* socket unavailable */ }

    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/my-interests — get the current user's interest tags
// ═════════════════════════════════════════════════════════════════════════════

router.get('/my-interests', async (req, res, next) => {
  try {
    const uid = userId(req);
    const interests = await prisma.userInterest.findMany({
      where: { userId: uid },
      include: { tag: { select: { slug: true, label: true, category: true } } },
      orderBy: { tag: { category: 'asc' } },
    });
    res.json({ tags: interests.map((ui) => ui.tag) });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/clubs/my-interests — replace the user's interest tags
// ═════════════════════════════════════════════════════════════════════════════

const userInterestsSchema = z.object({
  tagSlugs: z.array(z.string().min(1).max(60)).max(20),
});

router.put('/my-interests', async (req, res, next) => {
  try {
    const uid = userId(req);
    const parsed = userInterestsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(apiErrorBody(parsed.error.issues[0]?.message ?? 'Invalid body'));
    }
    const { tagSlugs } = parsed.data;

    // Resolve tag slugs to IDs
    const tags = await prisma.interestTag.findMany({
      where: { slug: { in: tagSlugs } },
      select: { id: true, slug: true, label: true, category: true },
    });

    // Replace atomically
    await prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId: uid } });
      if (tags.length > 0) {
        await tx.userInterest.createMany({
          data: tags.map((t) => ({ userId: uid, tagId: t.id })),
          skipDuplicates: true,
        });
      }
    });

    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/interest-tags — vocabulary
// ═════════════════════════════════════════════════════════════════════════════

router.get('/interest-tags', async (_req, res, next) => {
  try {
    const tags = await prisma.interestTag.findMany({
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/:id/invites — create an invite (direct user or token link)
// ═════════════════════════════════════════════════════════════════════════════

const createInviteSchema = z.object({
  inviteeUserId: z.number().int().positive().optional().nullable(),
  expiresInHours: z.number().int().min(1).max(720).default(168), // 7 days default
});

router.post('/:id/invites', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);
    const { inviteeUserId, expiresInHours } = createInviteSchema.parse(req.body);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, serverId: true, ownerId: true, slug: true, status: true },
    });
    if (!club || !club.serverId || club.status !== 'APPROVED') {
      return res.status(404).json(apiErrorBody('Club not found or not active'));
    }

    // Only owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Only owner or moderators can create invites'));
    }

    // Generate a URL-safe token
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.$transaction(async (tx) => {
      const inv = await tx.clubInvite.create({
        data: {
          clubId,
          inviterUserId: uid,
          inviteeUserId: inviteeUserId ?? null,
          token,
          expiresAt,
          status: 'PENDING',
        },
        include: {
          invitee: inviteeUserId ? { select: { id: true, full_name: true } } : false,
        },
      });

      // If direct invite, notify the invitee
      if (inviteeUserId) {
        await tx.discussionNotification.create({
          data: {
            userId: inviteeUserId,
            groupId: club.serverId,
            type: 'CLUB_INVITE',
            payload: {
              clubId,
              slug: club.slug,
              inviteId: inv.id,
              token,
              inviterUserId: uid,
            },
          },
        });

        try {
          const io = getIo();
          io.to(`user:${inviteeUserId}`).emit('club:invited', {
            clubId,
            slug: club.slug,
            token,
          });
        } catch { /* socket unavailable */ }
      }

      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'CREATE',
          payload: {
            kind: inviteeUserId ? 'direct' : 'link',
            inviteId: inv.id,
            inviteeUserId: inviteeUserId ?? null,
          },
        },
      });

      return inv;
    });

    res.status(201).json({
      invite: {
        ...invite,
        inviteUrl: `/dashboard/clubs/invite/${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:id/invites — list active invites
// ═════════════════════════════════════════════════════════════════════════════

router.get('/:id/invites', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    // Only owner or moderator
    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const invites = await prisma.clubInvite.findMany({
      where: {
        clubId,
        status: 'PENDING',
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        inviter: { select: { id: true, full_name: true } },
        invitee: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      invites: invites.map((inv) => ({
        ...inv,
        inviteUrl: `/dashboard/clubs/invite/${inv.token}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/clubs/:id/invites/:inviteId — revoke an invite
// ═════════════════════════════════════════════════════════════════════════════

router.delete('/:id/invites/:inviteId', async (req, res, next) => {
  try {
    const clubId = Number(req.params.id);
    const inviteId = Number(req.params.inviteId);
    const uid = userId(req);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { serverId: true, ownerId: true },
    });
    if (!club || !club.serverId) {
      return res.status(404).json(apiErrorBody('Club not found'));
    }

    const isOwner = club.ownerId === uid;
    if (!isOwner) {
      const mem = await prisma.discussionGroupMembership.findFirst({
        where: { groupId: club.serverId, userId: uid, leftAt: null, isActive: true, role: 'ADMIN' },
      });
      if (!mem) return res.status(403).json(apiErrorBody('Forbidden'));
    }

    const invite = await prisma.clubInvite.findFirst({
      where: { id: inviteId, clubId, revokedAt: null },
    });
    if (!invite) {
      return res.status(404).json(apiErrorBody('Invite not found'));
    }

    await prisma.$transaction(async (tx) => {
      await tx.clubInvite.update({
        where: { id: inviteId },
        data: { revokedAt: new Date(), status: 'REVOKED' },
      });
      await tx.clubModerationAudit.create({
        data: {
          clubId,
          actorUserId: uid,
          action: 'REVOKE_INVITE',
          payload: { inviteId },
        },
      });
    });

    res.json({ revoked: true });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/clubs/invites/accept — accept an invite by token
// ═════════════════════════════════════════════════════════════════════════════

router.post('/invites/accept', async (req, res, next) => {
  try {
    const uid = userId(req);
    const token = String(req.body?.token ?? '').trim();
    if (!token) {
      return res.status(400).json(apiErrorBody('Token is required'));
    }

    const invite = await prisma.clubInvite.findUnique({
      where: { token },
      include: {
        club: {
          select: {
            id: true, slug: true, serverId: true, status: true,
            name: true, ownerId: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found', code: 'INVITE_NOT_FOUND' });
    }
    if (invite.revokedAt) {
      return res.status(410).json({ error: 'This invite has been revoked', code: 'INVITE_REVOKED' });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite has expired', code: 'INVITE_EXPIRED' });
    }
    if (invite.status !== 'PENDING') {
      return res.status(410).json({ error: 'This invite is no longer valid', code: 'INVITE_USED' });
    }
    if (!invite.club || invite.club.status !== 'APPROVED' || !invite.club.serverId) {
      return res.status(404).json({ error: 'Club is not available', code: 'CLUB_NOT_AVAILABLE' });
    }
    // If targeted at a specific user, check it's them
    if (invite.inviteeUserId && invite.inviteeUserId !== uid) {
      return res.status(403).json({ error: 'This invite is for another user', code: 'INVITE_WRONG_USER' });
    }

    const serverId = invite.club.serverId;

    // Already a member?
    const existing = await prisma.discussionGroupMembership.findFirst({
      where: { groupId: serverId, userId: uid, leftAt: null, isActive: true },
    });
    if (existing) {
      return res.json({
        joined: true,
        alreadyMember: true,
        club: invite.club,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark invite as used (for direct invites — link invites stay PENDING so others can use them)
      if (invite.inviteeUserId) {
        await tx.clubInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date(), status: 'ACCEPTED' },
        });
      }

      // Insert membership
      const membership = await tx.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: serverId, userId: uid } },
        update: {
          role: 'STUDENT',
          canPost: true,
          leftAt: null,
          isActive: true,
        },
        create: {
          groupId: serverId,
          userId: uid,
          role: 'STUDENT',
          canPost: true,
        },
      });

      await tx.club.update({
        where: { id: invite.clubId },
        data: { memberCountCache: { increment: 1 } },
      });

      return membership;
    });

    // Socket push
    try {
      const io = getIo();
      io.to(`user:${uid}`).emit('club:joined', {
        clubId: invite.clubId,
        slug: invite.club.slug,
        serverId,
      });
    } catch { /* socket unavailable */ }

    res.json({
      joined: true,
      alreadyMember: false,
      club: invite.club,
    });
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/invites/:token/preview — public preview of an invite (for link cards)
// ═════════════════════════════════════════════════════════════════════════════

router.get('/invites/:token/preview', async (req, res, next) => {
  try {
    const token = String(req.params.token).trim();
    const invite = await prisma.clubInvite.findUnique({
      where: { token },
      include: {
        club: {
          select: {
            id: true, slug: true, name: true, tagline: true,
            bannerUrl: true, iconUrl: true, themeColor: true,
            memberCountCache: true, isOfficial: true, scopeKind: true,
            status: true,
          },
        },
        inviter: { select: { id: true, full_name: true } },
      },
    });

    if (!invite || invite.revokedAt || invite.club?.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Invite not found or expired' });
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }

    res.json({
      club: invite.club,
      inviter: invite.inviter,
      token,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Combined dean / super-admin middleware. Populates req.facultyId for deans.
 */
async function requireDeanOrSuperAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === 'SUPER_ADMIN') return next();
  if (role === 'DEAN') {
    const deanProfile = await prisma.deanProfile.findUnique({
      where: { userId: Number(req.user.id ?? req.user.sub) },
      select: { facultyId: true },
    });
    if (!deanProfile) {
      return res.status(403).json(apiErrorBody('No faculty assignment found'));
    }
    req.facultyId = deanProfile.facultyId;
    return next();
  }
  return res.status(403).json(apiErrorBody('Access restricted to Deans and Super Admins'));
}

/**
 * Shape a Club row for the API response — strips internal fields, flattens interests.
 */
function formatClubForApi(club) {
  const { interests, _count, ...rest } = club;
  return {
    ...rest,
    interests: interests?.map((ci) => ci.tag) ?? [],
    pendingRequestCount: _count?.joinRequests ?? undefined,
  };
}

export default router;
