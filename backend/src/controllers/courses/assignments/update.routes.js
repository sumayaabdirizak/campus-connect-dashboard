import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { attachmentInclude, normaliseModes, normaliseMaxMarks, normaliseLateWindow } from './shared.js';
import {
  notifyAssignmentPublished,
  notifyAssignmentUpdated,
} from './notifyStudents.js';
import {
  ensureLifecycle,
  enrichAssignmentDto,
  publishStatusFromDraft,
  transitionPublish,
} from '../../../features/assignments/lifecycleService.js';

const router = Router();

router.patch('/:assignmentId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });
  const late = normaliseLateWindow(lateWindowMinutes);
  if (late.error) return res.status(400).json({ message: late.error });

  const id = parseInt(assignmentId, 10);
  const before = await prisma.assignment.findUnique({
    where: { id },
    select: {
      open_at: true,
      due_date: true,
      title: true,
      lateWindowMinutes: true,
      courseOffering: { select: { publicId: true } },
      lifecycle: { select: { publishStatus: true } },
    },
  });
  if (!before) return res.status(404).json({ message: 'Assignment not found' });

  const nextOpen =
    open_at !== undefined ? (open_at ? new Date(open_at) : null) : before.open_at;
  const nextDue = due_date ? new Date(due_date) : before.due_date;

  if (due_date && Number.isNaN(nextDue.getTime())) {
    return res.status(400).json({ message: 'due_date is invalid' });
  }
  if (open_at && Number.isNaN(nextOpen?.getTime?.() ?? NaN)) {
    return res.status(400).json({ message: 'open_at is invalid' });
  }
  if (nextOpen && nextDue && nextOpen.getTime() >= nextDue.getTime()) {
    return res.status(400).json({ message: 'open_at must be before due_date' });
  }

  const actorUserId = Number(req.user?.id ?? req.user?.sub) || null;
  const wasDraft = before.lifecycle?.publishStatus === 'DRAFT';

  const assignment = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
        ...(due_date && { due_date: new Date(due_date) }),
        ...modes.data,
        ...late.data,
        ...marks.data,
      },
      include: {
        submissions: true,
        lifecycle: true,
        ...attachmentInclude,
        _count: { select: { submissions: true } },
      },
    });

    if (is_draft !== undefined) {
      await transitionPublish(
        id,
        publishStatusFromDraft(Boolean(is_draft)),
        actorUserId,
        tx,
      );
      updated.lifecycle = {
        ...(updated.lifecycle ?? {}),
        publishStatus: publishStatusFromDraft(Boolean(is_draft)),
      };
    } else {
      await ensureLifecycle(
        id,
        {
          isDraft: updated.lifecycle?.publishStatus === 'DRAFT',
          openAt: updated.open_at,
          dueDate: updated.due_date,
          lateWindowMinutes: updated.lateWindowMinutes,
          actorUserId,
          eventType: 'SCHEDULE_CHANGED',
        },
        tx,
      );
    }
    return updated;
  });

  const dto = enrichAssignmentDto(assignment);
  const publicId = before.courseOffering?.publicId;
  if (publicId && wasDraft && !dto.is_draft) {
    notifyAssignmentPublished(assignment, publicId);
  } else if (
    publicId &&
    !dto.is_draft &&
    ((title && title !== before.title) ||
      (due_date && new Date(due_date).getTime() !== before.due_date.getTime()))
  ) {
    notifyAssignmentUpdated(assignment, publicId);
  }

  res.json(dto);
}));

export default router;
