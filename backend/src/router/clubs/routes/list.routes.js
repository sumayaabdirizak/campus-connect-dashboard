import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { formatClubForApi } from '../../../controllers/clubs/shared.js';
import { attachViewerJoinState } from '../../../controllers/clubs/viewerJoinState.js';
import { viewerClubDiscoveryWhere } from '../../../controllers/clubs/viewerClubDiscovery.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const {
      scope, // FACULTY | UNIVERSITY | CROSS
      facultyId, // optional extra filter
      interest,
      q,
      sort = 'popular',
      cursor,
      limit = '20',
    } = req.query;

    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const and = [{ status: 'APPROVED' }];

    const discovery = viewerClubDiscoveryWhere(req);
    if (Object.keys(discovery).length > 0) and.push(discovery);

    // Explicit query filters still apply (admin tooling / refined search).
    if (scope) and.push({ scopeKind: String(scope).toUpperCase() });
    const fid = Number(facultyId);
    if (Number.isFinite(fid) && fid > 0) and.push({ facultyId: fid });

    if (interest) {
      const slugs = String(interest)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (slugs.length > 0) {
        and.push({ interests: { some: { tag: { slug: { in: slugs } } } } });
      }
    }

    if (q) {
      const term = String(q).trim();
      if (term.length >= 2) {
        and.push({
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { tagline: { contains: term, mode: 'insensitive' } },
          ],
        });
      }
    }

    const where = { AND: and };

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

    const findArgs = {
      where,
      orderBy,
      take: take + 1,
      include: {
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { slug: true, label: true } } } },
        _count: { select: { requests: { where: { status: 'PENDING' } } } },
      },
    };
    if (cursor) {
      findArgs.cursor = { id: Number(cursor) };
      findArgs.skip = 1;
    }

    const clubs = await prisma.club.findMany(findArgs);
    const hasMore = clubs.length > take;
    if (hasMore) clubs.pop();

    const nextCursor = hasMore ? clubs[clubs.length - 1]?.id : null;
    const uid = Number(req.user?.id ?? req.user?.sub);
    const formatted = clubs.map(formatClubForApi);
    const withStatus = await attachViewerJoinState(formatted, uid);

    res.json({
      clubs: withStatus,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
