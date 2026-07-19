import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { formatClubForApi } from '../shared.js';
import { requireDeanOrSuperAdmin } from '../requireDeanOrSuperAdmin.js';

const router = express.Router();

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
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const facultyFilter = req.user.role !== 'SUPER_ADMIN' && req.facultyId
      ? { facultyId: req.facultyId } : {};
    const statusFilter = status ? { status: String(status).toUpperCase() } : {};
    const where = { ...facultyFilter, ...statusFilter };

    const [totalCount, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, full_name: true, email: true } },
          faculty: { select: { id: true, name: true } },
          interests: { include: { tag: { select: { slug: true, label: true } } } },
          _count: { select: { members: true } },
        },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: 'Clubs fetched',
        name: 'clubs',
        items: clubs,
        page,
        pageSize,
        totalCount,
      })
    );
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
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    // Scope to dean's faculty unless super-admin
    if (req.user.role !== 'SUPER_ADMIN' && req.facultyId) {
      where.facultyId = req.facultyId;
    }

    const [totalCount, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          owner: { select: { id: true, full_name: true, email: true } },
          faculty: { select: { id: true, name: true } },
          interests: { include: { tag: { select: { slug: true, label: true } } } },
        },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: 'Pending clubs fetched',
        name: 'clubs',
        items: clubs,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    next(err);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/clubs/:slug — single club detail
// ═════════════════════════════════════════════════════════════════════════════

export default router;
