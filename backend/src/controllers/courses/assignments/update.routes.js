import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { pushToUsers } from '../../../services/pushNotifier.service.js';
import { courseOfferingDashboardPath } from '../../../utils/courseOfferingAccess.js';
import { attachmentInclude, normaliseModes, normaliseMaxMarks } from './shared.js';

const router = Router();

router.patch('/:assignmentId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });

  // Snapshot the old draft state so we can detect publish transitions.
  const before = await prisma.assignment.findUnique({
    where: { id: parseInt(assignmentId, 10) },
    select: { is_draft: true },
  });

  const assignment = await prisma.assignment.update({
    where: { id: parseInt(assignmentId, 10) },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
      ...(due_date && { due_date: new Date(due_date) }),
      ...(is_draft !== undefined && { is_draft: Boolean(is_draft) }),
      ...modes.data,
      ...(Number.isInteger(lateWindowMinutes) && { lateWindowMinutes }),
      ...marks.data,
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  // ── Notify enrolled students when an assignment is published ─────────
  // Only fires on the draft→published transition (not on every PATCH).
  if (before?.is_draft && !assignment.is_draft) {
    (async () => {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: assignment.courseOfferingId },
        select: {
          publicId: true,
          section: {
            include: { studentRegistrations: { select: { studentId: true } } },
          },
        },
      });
      const studentIds = offering?.section?.studentRegistrations?.map((r) => r.studentId) ?? [];
      if (studentIds.length === 0 || !offering?.publicId) return;
      pushToUsers(studentIds, {
        title: 'New assignment',
        body: `${assignment.title} · due ${new Date(assignment.due_date).toLocaleDateString()}`,
        url: courseOfferingDashboardPath(offering.publicId, 'assignments'),
        tag: `assignment-new-${assignment.id}`,
      }).catch(() => {});
    })();
  }

  res.json(assignment);
}));

export default router;
