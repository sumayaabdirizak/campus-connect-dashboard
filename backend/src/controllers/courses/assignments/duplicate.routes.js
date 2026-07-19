import { Router } from 'express';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireAssignmentManage } from '../../../middleware/courseOfferingRbac.js';

const router = Router();

router.post(
  '/:assignmentId/duplicate', requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.assignmentId, 10);

    const source = await prisma.assignment.findUnique({
      where: { id },
      include: {
        attachments: true,
      },
    });
    if (!source) return res.status(404).json({ message: 'Assignment not found' });

    const created = await prisma.$transaction(async (tx) => {
      const fresh = await tx.assignment.create({
        data: {
          title: `Copy of ${source.title}`,
          description: source.description,
          open_at: source.open_at,
          due_date: source.due_date,
          is_draft: true, // always draft — protects against accidental publish
          courseOfferingId: source.courseOfferingId,
          workMode: source.workMode,
          gradingScope: source.gradingScope,
          lateWindowMinutes: source.lateWindowMinutes,
          maxMarks: source.maxMarks,
        },
      });

      // Clone attachment ROWS (file URLs are shared — the on-disk files
      // are referenced, not copied, since both rows point to the same URL).
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
          attachments: {
            orderBy: { created_at: 'asc' },
            include: { uploadedBy: { select: { id: true, full_name: true } } },
          },
          _count: { select: { submissions: true } },
        },
      });
    });

    res.status(201).json(created);
  })
);

export default router;
