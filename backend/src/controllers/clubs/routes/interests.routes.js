import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { userId, userInterestsSchema } from '../shared.js';

const router = express.Router();

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

export default router;
