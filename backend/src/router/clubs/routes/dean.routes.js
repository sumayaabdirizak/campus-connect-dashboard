import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { isCrossFacultyAdmin } from '../../../../../shared/roles.js';
import { formatClubForApi } from '../../../controllers/clubs/shared.js';
import { requireDeanOrSuperAdmin } from '../../../controllers/clubs/requireDeanOrSuperAdmin.js';

const router = express.Router();

/**
 * Faculty-scoped deans are restricted to clubs in their own faculty — but
 * only FACULTY-scoped clubs carry a facultyId at all. A UNIVERSITY/CROSS
 * club has facultyId=null, so filtering on `{ facultyId: req.facultyId }`
 * unconditionally hid every non-faculty application from every dean, with
 * no queue anyone but a cross-faculty admin could ever see them in.
 */
function facultyScope(req) {
  if (!isCrossFacultyAdmin(req.user.role) && req.facultyId) {
    return { OR: [{ facultyId: req.facultyId }, { scopeKind: { not: 'FACULTY' } }] };
  }
  return null;
}

const clubListInclude = {
  owner: { select: { id: true, full_name: true, email: true } },
  faculty: { select: { id: true, name: true } },
  interests: { include: { tag: { select: { slug: true, label: true } } } },
};

router.get('/dean/stats', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const facultyFilter = facultyScope(req);
    const [approved, pending, suspended, rejected] = await Promise.all([
      prisma.club.count({ where: { ...facultyFilter, status: 'APPROVED' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'PENDING' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'SUSPENDED' } }),
      prisma.club.count({ where: { ...facultyFilter, status: 'REJECTED' } }),
    ]);
    res.json({
      approved,
      pending,
      suspended,
      rejected,
      total: approved + pending + suspended + rejected,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/dean/all', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    // Built as an AND list rather than merged object keys: facultyScope and
    // the search term both need their own `OR`, and a second `where.OR =`
    // assignment would silently overwrite the first instead of combining.
    const conditions = [];
    const scope = facultyScope(req);
    if (scope) conditions.push(scope);
    if (status) conditions.push({ status: String(status).toUpperCase() });
    const term = String(q ?? '').trim();
    if (term.length >= 2) {
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { tagline: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [totalCount, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: clubListInclude,
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: 'Clubs fetched',
        name: 'clubs',
        items: clubs.map(formatClubForApi),
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get('/dean/pending', requireDeanOrSuperAdmin, async (req, res, next) => {
  try {
    const where = { status: 'PENDING', ...facultyScope(req) };
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const [totalCount, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: clubListInclude,
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: 'Pending clubs fetched',
        name: 'clubs',
        items: clubs.map(formatClubForApi),
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    next(err);
  }
});

export default router;
