import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { listClubsForUser } from '../../../features/clubs/club.service.js';
import { userId, handleServiceError, formatClubForApi } from '../shared.js';

const router = express.Router();

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

export default router;
