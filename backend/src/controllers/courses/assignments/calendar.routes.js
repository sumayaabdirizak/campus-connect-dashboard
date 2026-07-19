import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingRead } from '../../../middleware/courseOfferingRbac.js';
import { buildIcs } from './ics.js';

const router = Router();

router.get('/:assignmentId/calendar.ics', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.assignmentId, 10);
  const a = await prisma.assignment.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ message: 'Not found' });

  const events = [];
  if (a.open_at) {
    events.push({
      uid: `assignment-${id}-open@campus-connect`,
      start: a.open_at,
      end: new Date(a.open_at.getTime() + 30 * 60_000),
      title: `Opens: ${a.title}`,
      description: a.description ?? '',
    });
  }
  events.push({
    uid: `assignment-${id}-due@campus-connect`,
    start: a.due_date,
    end: new Date(a.due_date.getTime() + 30 * 60_000),
    title: `Due: ${a.title}`,
    description: a.description ?? '',
  });

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="assignment-${id}.ics"`);
  res.send(buildIcs(events));
}));

/// All assignments in a course offering as one .ics file. Useful for
/// subscribing once and getting every deadline.
router.get('/course/:courseOfferingId/calendar.ics', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const courseOfferingId = req.courseOffering.id;
  const list = await prisma.assignment.findMany({
    where: { courseOfferingId, is_draft: false },
    select: { id: true, title: true, description: true, open_at: true, due_date: true },
    orderBy: { due_date: 'asc' },
  });
  const events = [];
  for (const a of list) {
    if (a.open_at) {
      events.push({
        uid: `assignment-${a.id}-open@campus-connect`,
        start: a.open_at,
        end: new Date(a.open_at.getTime() + 30 * 60_000),
        title: `Opens: ${a.title}`,
        description: a.description ?? '',
      });
    }
    events.push({
      uid: `assignment-${a.id}-due@campus-connect`,
      start: a.due_date,
      end: new Date(a.due_date.getTime() + 30 * 60_000),
      title: `Due: ${a.title}`,
      description: a.description ?? '',
    });
  }
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="course-${req.courseOffering.publicId}-assignments.ics"`);
  res.send(buildIcs(events));
}));

export default router;
