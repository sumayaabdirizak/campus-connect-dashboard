import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { apiErrorBody } from '../../utils/apiEnvelope.js';

const router = Router();

/**
 * GET /api/rbac/me/nav-pages
 *
 * Placeholder for future DB-backed nav ACL. Returns an empty `pages` list so
 * the frontend keeps using role-only sidebar filtering (see use-nav.ts).
 */
router.get('/me/nav-pages', async (req, res) => {
  try {
    const userId = Number(req.user?.id ?? req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json(apiErrorBody('Unauthorized', null));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    });
    if (!user) {
      return res.status(404).json(apiErrorBody('User not found', null));
    }

    return res.json({
      user: { id: user.id, role: String(user.role?.name || '') },
      pages: [],
    });
  } catch (err) {
    console.error('GET /rbac/me/nav-pages failed', err);
    return res.status(500).json(apiErrorBody('Failed to load nav pages', null));
  }
});

export default router;
