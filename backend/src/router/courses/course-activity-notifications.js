import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user?.id ?? req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const take = Math.min(80, Math.max(1, Number(req.query.limit) || 40));
    const rows = await prisma.courseActivityNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        href: true,
        createdAt: true,
        readAt: true,
        courseOffering: {
          select: {
            publicId: true,
            course: { select: { code: true } },
          },
        },
      },
    });
    res.json({
      results: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        href: r.href,
        createdAt: r.createdAt.toISOString(),
        readAt: r.readAt ? r.readAt.toISOString() : null,
        courseCode: r.courseOffering?.course?.code ?? null,
        courseOfferingId: r.courseOffering?.publicId ?? null,
      })),
    });
  })
);

router.post(
  '/read',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user?.id ?? req.user?.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { notificationIds, markAll } = req.body ?? {};
    if (markAll) {
      await prisma.courseActivityNotification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return res.json({ ok: true });
    }
    const ids = Array.isArray(notificationIds)
      ? notificationIds.map(Number).filter(Number.isFinite)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ message: 'notificationIds required' });
    }
    await prisma.courseActivityNotification.updateMany({
      where: { userId, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  })
);

export default router;
