import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireQuizManage } from '../../../middleware/courseOfferingRbac.js';
import { patchQuizBodySchema } from '../../../validation/quizSchemas.js';
import { resolveModuleIdForOffering, assertMarksPlanAllowedForMode, normalizeOfflineDelivery } from './helpers.js';
import { notifyQuizPublished } from './notifyStudents.js';
import {
  assertCourseMarkBudget,
  resolveQuizCourseMarks,
} from '../../../services/courses/courseMarkBudget.service.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch('/:quizId', requireQuizManage(), validateBody(patchQuizBodySchema), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const {
      title, description, duration_minutes, is_draft, open_at, close_at,
      shuffle_questions, shuffle_answers, max_attempts, passing_score,
      timing_mode, scheduled_duration, mode, marksPlan, moduleId, confidence_scoring,
      auto_publish_at_open,
      maxMarks,
      offline_delivery,
    } = req.body;

    const existing = await prisma.quiz.findUnique({
      where: { id: qid },
      select: {
        courseOfferingId: true,
        timing_mode: true,
        open_at: true,
        close_at: true,
        duration_minutes: true,
        is_draft: true,
        auto_publish_at_open: true,
        mode: true,
        offline_delivery: true,
        marksPlan: true,
        maxMarks: true,
        questions: { select: { points: true } },
        paperFile: { select: { id: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!existing) return res.status(404).json({ message: 'Quiz not found' });

    const nextMode = mode ?? existing.mode ?? 'online';
    const nextDelivery =
      offline_delivery !== undefined
        ? normalizeOfflineDelivery(nextMode, offline_delivery)
        : nextMode === 'offline'
          ? (existing.offline_delivery ?? 'built')
          : null;

    if (marksPlan !== undefined) {
      assertMarksPlanAllowedForMode(nextMode, marksPlan);
    }
    if (mode === 'online' && existing.marksPlan) {
      assertMarksPlanAllowedForMode('online', existing.marksPlan);
    }

    const nextDraft = is_draft !== undefined ? is_draft : undefined;
    const isUploaded = nextDelivery === 'uploaded';

    if (nextDraft === false && existing._count.questions === 0) {
      if (!isUploaded) {
        return res.status(400).json({ message: 'Cannot publish a quiz with no questions' });
      }
      if (!existing.paperFile) {
        return res.status(400).json({
          message: 'Upload the quiz document before publishing an uploaded paper quiz.',
        });
      }
    }

    const nextTimingMode = timing_mode ?? existing.timing_mode;
    const nextOpenAt =
      open_at !== undefined
        ? (open_at ? new Date(open_at) : null)
        : existing.open_at;
    const nextCloseAt =
      close_at !== undefined
        ? (close_at ? new Date(close_at) : null)
        : existing.close_at;
    if (nextTimingMode === 'fixed' && !nextOpenAt) {
      return res.status(400).json({ message: 'Fixed mode requires an open time' });
    }
    if (
      nextTimingMode === 'flexible' &&
      nextOpenAt &&
      nextCloseAt &&
      nextOpenAt.getTime() >= nextCloseAt.getTime()
    ) {
      return res.status(400).json({ message: 'Open time must be before close time' });
    }

    let nextAutoPublish =
      auto_publish_at_open !== undefined
        ? !!auto_publish_at_open
        : existing.auto_publish_at_open;
    // Publishing now clears the schedule flag.
    if (nextDraft === false) nextAutoPublish = false;
    // Enabling schedule forces draft.
    let draftWrite = is_draft;
    if (auto_publish_at_open === true) {
      draftWrite = true;
      if (!nextOpenAt) {
        return res.status(400).json({ message: 'Scheduled publish requires an open time' });
      }
    }

    let resolvedModuleId;
    if (moduleId !== undefined) {
      try {
        resolvedModuleId = await resolveModuleIdForOffering(moduleId, existing.courseOfferingId);
      } catch (e) {
        return res.status(e.status || 400).json({ message: e.message });
      }
    }

    const willUnpublish =
      !existing.is_draft &&
      (draftWrite === true || nextDraft === true);
    if (willUnpublish) {
      const openAttempts = await prisma.quizAttempt.count({
        where: { quizId: qid, submitted_at: null },
      });
      if (openAttempts > 0) {
        return res.status(400).json({
          message: 'Cannot unpublish while students have in-progress attempts',
        });
      }
    }

    const willPublish = existing.is_draft && (nextDraft === false || draftWrite === false);
    const nextMarksPlan = isUploaded
      ? null
      : marksPlan !== undefined
        ? marksPlan
        : existing.marksPlan;
    const questionPointsSum = isUploaded
      ? 0
      : existing.questions.reduce((s, q) => s + q.points, 0);
    let nextCourseMarks = existing.maxMarks;

    if (willPublish || maxMarks !== undefined || !existing.is_draft) {
      nextCourseMarks = resolveQuizCourseMarks({
        maxMarks: maxMarks ?? existing.maxMarks,
        marksPlan: nextMarksPlan,
        questionPointsSum,
      });
      if (willPublish && nextCourseMarks <= 0) {
        return res.status(400).json({
          message:
            'Set course marks for this quiz (marks plan total or maxMarks) before publishing.',
        });
      }
      if (nextCourseMarks > 0) {
        const budget = await assertCourseMarkBudget(
          existing.courseOfferingId,
          nextCourseMarks,
          { excludeQuizId: qid }
        );
        if (budget.error) return res.status(400).json({ message: budget.error });
      }
    }

    const scheduleResets = {};
    if (open_at !== undefined) {
      const nextOpen = open_at ? new Date(open_at) : null;
      // Future (re)open should fire QUIZ_OPENING again.
      if (!nextOpen || nextOpen.getTime() > Date.now()) {
        scheduleResets.open_notified_at = null;
      }
    }
    if (
      close_at !== undefined ||
      duration_minutes !== undefined ||
      timing_mode !== undefined
    ) {
      scheduleResets.closing_notified_at = null;
    }

    const quiz = await prisma.quiz.update({
      where: { id: qid },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(duration_minutes && { duration_minutes }),
        ...(draftWrite !== undefined && { is_draft: draftWrite }),
        ...(auto_publish_at_open !== undefined || nextDraft === false
          ? { auto_publish_at_open: nextAutoPublish }
          : {}),
        ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
        ...(close_at !== undefined && { close_at: close_at ? new Date(close_at) : null }),
        ...(shuffle_questions !== undefined && { shuffle_questions }),
        ...(shuffle_answers !== undefined && { shuffle_answers }),
        ...(max_attempts && { max_attempts }),
        ...(passing_score !== undefined && { passing_score }),
        ...(timing_mode && { timing_mode }),
        ...(mode && { mode }),
        ...(offline_delivery !== undefined || mode !== undefined
          ? { offline_delivery: nextDelivery }
          : {}),
        ...(marksPlan !== undefined || isUploaded && offline_delivery !== undefined
          ? { marksPlan: isUploaded ? null : marksPlan }
          : {}),
        ...(willPublish || maxMarks !== undefined || !existing.is_draft
          ? { maxMarks: nextCourseMarks }
          : {}),
        ...(scheduled_duration !== undefined && { scheduled_duration }),
        ...(confidence_scoring !== undefined && { confidence_scoring: !!confidence_scoring }),
        ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
        ...scheduleResets,
      },
      include: {
        questions: { include: { options: true } },
        paperFile: true,
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: {
          select: {
            attempts: { where: { submitted_at: { not: null } } },
          },
        },
      },
    });

    if (existing.is_draft && quiz.is_draft === false) {
      notifyQuizPublished(quiz, req.courseOffering.publicId);
    }

    res.json(quiz);
  }));

  router.delete('/:quizId', requireQuizManage(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    await prisma.quiz.delete({ where: { id: qid } });
    res.json({ success: true });
  }));
}
