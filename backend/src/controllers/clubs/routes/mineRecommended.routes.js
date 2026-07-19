import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { namedListSuccess } from '../../../utils/apiEnvelope.js';
import { parsePaginationQuery } from '../../../utils/pagination.js';
import { listClubsForUser } from '../../../features/clubs/club.service.js';
import { userId, handleServiceError, formatClubForApi } from '../shared.js';

const router = express.Router();

router.get('/mine', async (req, res, next) => {
  try {
    const uid = userId(req);
    const result = await listClubsForUser(uid);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/clubs/recommended â€” interest-based recommendations
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET /api/clubs/dean/stats â€” faculty club counts grouped by status
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default router;

