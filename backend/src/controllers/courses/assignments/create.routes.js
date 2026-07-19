import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';
import { attachmentInclude, normaliseModes, normaliseMaxMarks } from './shared.js';

const router = Router();

router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });

  const openAtDate = open_at ? new Date(open_at) : null;
  const dueDateObj = due_date ? new Date(due_date) : new Date();
  if (openAtDate && openAtDate > dueDateObj) {
    return res.status(400).json({ message: 'open_at must be before due_date' });
  }

  const coId = req.courseOffering.id;
  const offeringPublicId = req.courseOffering.publicId;
  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      open_at: openAtDate,
      due_date: dueDateObj,
      is_draft: Boolean(is_draft),
      courseOfferingId: coId,
      ...modes.data,
      ...(Number.isInteger(lateWindowMinutes) ? { lateWindowMinutes } : {}),
      ...marks.data,
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  // ── Notify enrolled students when a published assignment is created ──
  if (!assignment.is_draft) {
    (async () => {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: coId },
        include: {
          section: {
            include: { studentRegistrations: { select: { studentId: true } } },
          },
        },
      });
      const studentIds = offering?.section?.studentRegistrations?.map((r) => r.studentId) ?? [];
      if (studentIds.length === 0) return;
      pushToUsers(studentIds, {
        title: 'New assignment',
        body: `${assignment.title} · due ${dueDateObj.toLocaleDateString()}`,
        url: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
        tag: `assignment-new-${assignment.id}`,
      }).catch(() => {});
    })();
  }

  res.json(assignment);
}));

export default router;
