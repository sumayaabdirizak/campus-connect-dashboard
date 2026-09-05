import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';
import { ensureLifecycle, enrichAssignmentDto } from '../../../services/assignments/lifecycleService.js';
import { reserveCourseMarkWeight } from '../../../services/courses/courseMarkBudget.service.js';

const router = Router();

router.post(
  '/:assignmentId/duplicate', requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.assignmentId, 10);
    const actorUserId = Number(req.user.id ?? req.user.sub) || null;

    const source = await prisma.assignment.findUnique({
      where: { id },
      include: {
        attachments: true,
      },
    });
    if (!source) return res.status(404).json({ message: 'Assignment not found' });

    const reserved = await reserveCourseMarkWeight(
      source.courseOfferingId,
      source.maxMarks ?? 10
    );
    if (reserved.error) return res.status(400).json({ message: reserved.error });

    const created = await prisma.$transaction(async (tx) => {
      const fresh = await tx.assignment.create({
        data: {
          title: `Copy of ${source.title}`,
          description: source.description,
          open_at: source.open_at,
          due_date: source.due_date,
          courseOfferingId: source.courseOfferingId,
          workMode: source.workMode,
          gradingScope: source.gradingScope,
          lateWindowMinutes: source.lateWindowMinutes,
          maxMarks: reserved.data.marks,
        },
      });

      await ensureLifecycle(
        fresh.id,
        {
          isDraft: true,
          openAt: fresh.open_at,
          dueDate: fresh.due_date,
          lateWindowMinutes: fresh.lateWindowMinutes,
          actorUserId,
          eventType: 'DUPLICATED',
        },
        tx,
      );

      if (source.attachments.length > 0) {
        await tx.assignmentAttachment.createMany({
          data: source.attachments.map((att) => ({
            assignmentId: fresh.id,
            name: att.name,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            uploadedById: req.user.id ?? req.user.sub,
          })),
        });
      }

      return tx.assignment.findUnique({
        where: { id: fresh.id },
        include: {
          lifecycle: true,
          attachments: {
            orderBy: { created_at: 'asc' },
            include: { uploadedBy: { select: { id: true, full_name: true } } },
          },
          _count: { select: { submissions: true } },
        },
      });
    });

    res.status(201).json({
      ...enrichAssignmentDto(created),
      ...(reserved.data.clamped && reserved.data.clampMessage
        ? { markBudgetNotice: reserved.data.clampMessage }
        : {}),
    });
  })
);

export default router;
