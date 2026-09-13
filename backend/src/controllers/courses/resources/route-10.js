import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireResourceRead } from '../../../middleware/courseOfferingRbac.js';

/** Cap per heartbeat (frontend flushes every 15s). */
const MAX_DELTA_PER_BEAT = 30;
/** Mark complete once watched ≥ 90% of reported duration. */
const COMPLETION_RATIO = 0.9;

function toSafeInt(value, fallback = 0) {
  const n = Math.round(Number(value) || 0);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/:resourceId/progress',
    requireResourceRead(),
    asyncHandler(async (req, res) => {
      if (req.user?.role !== 'STUDENT') {
        return res.json({ skipped: true });
      }
      const resourceId = parseInt(req.params.resourceId, 10);
      const studentId = Number(req.user.id ?? req.user.sub);
      if (!Number.isInteger(resourceId) || !Number.isInteger(studentId)) {
        return res.status(400).json({ message: 'Invalid resource or student' });
      }

      const rawDelta = Number(req.body?.watchedDelta) || 0;
      const delta = Math.max(0, Math.min(MAX_DELTA_PER_BEAT, toSafeInt(rawDelta)));
      const position = toSafeInt(req.body?.position);
      const duration = toSafeInt(req.body?.duration);
      const started = req.body?.started === true;
      const ended = req.body?.ended === true;

      const existing = await prisma.resourceView.findUnique({
        where: { resourceId_studentId: { resourceId, studentId } },
        select: {
          watchedSeconds: true,
          durationSeconds: true,
          viewCount: true,
          completed: true,
        },
      });

      let nextWatched = (existing?.watchedSeconds ?? 0) + delta;
      const nextDuration = Math.max(existing?.durationSeconds ?? 0, duration);

      if (ended && nextDuration > 0) {
        nextWatched = Math.max(nextWatched, nextDuration);
      } else if (nextDuration > 0 && position >= nextDuration * COMPLETION_RATIO) {
        nextWatched = Math.max(
          nextWatched,
          Math.round(nextDuration * COMPLETION_RATIO)
        );
      }

      if (started && nextWatched < 1) nextWatched = 1;

      const reachedThreshold =
        nextDuration > 0 && nextWatched >= nextDuration * COMPLETION_RATIO;
      const completed =
        (existing?.completed ?? false) || ended || reachedThreshold;
      const nextViewCount = (existing?.viewCount ?? 0) + (started ? 1 : 0);
      const createWatched = Math.max(
        delta,
        started ? 1 : 0,
        ended && nextDuration > 0 ? nextDuration : 0
      );

      const view = await prisma.resourceView.upsert({
        where: { resourceId_studentId: { resourceId, studentId } },
        create: {
          resourceId,
          studentId,
          watchedSeconds: createWatched,
          durationSeconds: nextDuration,
          lastPositionSeconds: position,
          completed,
          viewCount: 1,
        },
        update: {
          watchedSeconds: nextWatched,
          durationSeconds: nextDuration,
          lastPositionSeconds: position,
          completed,
          viewCount: nextViewCount === 0 ? 1 : nextViewCount,
        },
        select: {
          watchedSeconds: true,
          durationSeconds: true,
          lastPositionSeconds: true,
          completed: true,
        },
      });

      res.json(view);
    })
  );
}
