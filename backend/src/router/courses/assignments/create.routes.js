import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import {
  attachmentInclude,
  normaliseModes,
  normaliseMaxMarks,
  normaliseLateWindow,
} from '../../../controllers/courses/assignments/shared.js';
import { notifyAssignmentPublished } from '../../../controllers/courses/assignments/notifyStudents.js';
import { ensureLifecycle, enrichAssignmentDto } from '../../../services/assignments/lifecycleService.js';

const router = Router();

router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });
  const late = normaliseLateWindow(lateWindowMinutes);
  if (late.error) return res.status(400).json({ message: late.error });

  const openAtDate = open_at ? new Date(open_at) : null;
  const dueDateObj = due_date ? new Date(due_date) : new Date();
  if (!due_date || Number.isNaN(dueDateObj.getTime())) {
    return res.status(400).json({ message: 'due_date is required' });
  }
  if (dueDateObj.getTime() <= Date.now()) {
    return res.status(400).json({ message: 'due_date must be in the future' });
  }
  if (openAtDate && !Number.isNaN(openAtDate.getTime()) && openAtDate.getTime() < Date.now() - 60_000) {
    return res.status(400).json({ message: 'open_at cannot be in the past — omit it to open immediately' });
  }
  if (openAtDate && openAtDate > dueDateObj) {
    return res.status(400).json({ message: 'open_at must be before due_date' });
  }

  const coId = req.courseOffering.id;
  const offeringPublicId = req.courseOffering.publicId;
  const actorUserId = Number(req.user?.id ?? req.user?.sub) || null;
  const draft = Boolean(is_draft);

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.assignment.create({
      data: {
        title,
        description,
        open_at: openAtDate,
        due_date: dueDateObj,
        courseOfferingId: coId,
        ...modes.data,
        ...late.data,
        ...marks.data,
      },
      include: {
        submissions: true,
        ...attachmentInclude,
        _count: { select: { submissions: true } },
      },
    });
    await ensureLifecycle(
      created.id,
      {
        isDraft: draft,
        openAt: openAtDate,
        dueDate: dueDateObj,
        lateWindowMinutes: late.data?.lateWindowMinutes ?? 0,
        actorUserId,
        eventType: draft ? 'CREATED' : 'PUBLISHED',
      },
      tx,
    );
    return created;
  });

  const dto = enrichAssignmentDto({
    ...assignment,
    lifecycle: {
      publishStatus: draft ? 'DRAFT' : 'PUBLISHED',
      scheduleStatus: 'OPEN',
    },
  });
  if (!dto.is_draft) {
    notifyAssignmentPublished(assignment, offeringPublicId);
  }

  res.status(201).json(dto);
}));

export default router;
