import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { listClubsForUser } from '../../../services/clubs/club.service.js';
import { userId, formatClubForApi } from '../../../controllers/clubs/shared.js';
import { attachViewerJoinState } from '../../../controllers/clubs/viewerJoinState.js';
import { viewerClubDiscoveryWhere } from '../../../controllers/clubs/viewerClubDiscovery.js';

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

router.get('/recommended', async (req, res, next) => {
  try {
    const uid = userId(req);
    const take = Math.min(Number(req.query.limit) || 10, 20);

    const userInterests = await prisma.userInterest.findMany({
      where: { userId: uid },
      select: { tagId: true },
    });
    const userTagIds = userInterests.map((ui) => ui.tagId);

    const myServerIds = (
      await prisma.discussionGroupMembership.findMany({
        where: { userId: uid, leftAt: null, isActive: true },
        select: { groupId: true },
      })
    ).map((m) => m.groupId);

    const discovery = viewerClubDiscoveryWhere(req);
    const where = {
      status: 'APPROVED',
      ...(myServerIds.length > 0 ? { serverId: { notIn: myServerIds } } : {}),
      ...(Object.keys(discovery).length > 0 ? discovery : {}),
    };

    const clubs = await prisma.club.findMany({
      where,
      orderBy: [{ memberCountCache: 'desc' }],
      take: take * 3,
      include: {
        faculty: { select: { id: true, name: true } },
        interests: { include: { tag: { select: { id: true, slug: true, label: true } } } },
      },
    });

    const scored = clubs.map((club) => {
      const clubTagIds = club.interests.map((ci) => ci.tag.id);
      const overlap =
        userTagIds.length > 0
          ? clubTagIds.filter((tid) => userTagIds.includes(tid)).length
          : 0;
      const popScore = Math.min(club.memberCountCache / 10000, 1);
      return { club, score: overlap * 10 + popScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, take).map((s) => s.club);
    const formatted = top.map(formatClubForApi);
    const withStatus = await attachViewerJoinState(formatted, uid);

    res.json({ clubs: withStatus });
  } catch (err) {
    next(err);
  }
});

export default router;

