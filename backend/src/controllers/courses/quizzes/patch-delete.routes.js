import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { finalizeAttempt } from '../../../services/quizAttempt.service.js';
import { emitSubmitted as emitMonitorSubmitted } from '../../../socket/quizLiveMonitor.js';
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireQuizManage,
  requireQuizQuestionManage,
  requireStudentQuizAccess,
} from '../../../middleware/courseOfferingRbac.js';
import {
  createQuizBodySchema,
  patchQuizBodySchema,
  createQuestionBodySchema,
  patchQuestionBodySchema,
  submitAttemptBodySchema,
  reorderQuestionsBodySchema,
  importQuizCsvBodySchema,
} from '../../../validation/quizSchemas.js';
import {
  resolveModuleIdForOffering,
  assertQuizIsDraft,
  csvEscape,
  buildQuizCsv,
} from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch('/:quizId', requireQuizManage(), validateBody(patchQuizBodySchema), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    const {
      title, description, duration_minutes, is_draft, open_at, close_at,
      shuffle_questions, shuffle_answers, max_attempts, passing_score,
      timing_mode, scheduled_duration, moduleId, confidence_scoring
    } = req.body;
  
    const existing = await prisma.quiz.findUnique({
      where: { id: qid },
      select: {
        courseOfferingId: true,
        timing_mode: true,
        open_at: true,
        _count: { select: { questions: true } },
      },
    });
    if (!existing) return res.status(404).json({ message: 'Quiz not found' });
  
    const nextDraft = is_draft !== undefined ? is_draft : undefined;
    if (nextDraft === false && existing._count.questions === 0) {
      return res.status(400).json({ message: 'Cannot publish a quiz with no questions' });
    }
  
    const nextTimingMode = timing_mode ?? existing.timing_mode;
    const nextOpenAt =
      open_at !== undefined
        ? (open_at ? new Date(open_at) : null)
        : existing.open_at;
    if (nextTimingMode === 'fixed' && !nextOpenAt) {
      return res.status(400).json({ message: 'Fixed mode requires an open time' });
    }
  
    // For module changes, validate the new module sits inside the same offering
    // before we issue the update.
    let resolvedModuleId; // undefined = leave alone
    if (moduleId !== undefined) {
      try {
        resolvedModuleId = await resolveModuleIdForOffering(moduleId, existing.courseOfferingId);
      } catch (e) {
        return res.status(e.status || 400).json({ message: e.message });
      }
    }
  
    const quiz = await prisma.quiz.update({
      where: { id: qid },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(duration_minutes && { duration_minutes }),
        ...(is_draft !== undefined && { is_draft }),
        ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
        ...(close_at !== undefined && { close_at: close_at ? new Date(close_at) : null }),
        ...(shuffle_questions !== undefined && { shuffle_questions }),
        ...(shuffle_answers !== undefined && { shuffle_answers }),
        ...(max_attempts && { max_attempts }),
        ...(passing_score !== undefined && { passing_score }),
        ...(timing_mode && { timing_mode }),
        ...(scheduled_duration !== undefined && { scheduled_duration }),
        ...(confidence_scoring !== undefined && { confidence_scoring: !!confidence_scoring }),
        ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
      },
      include: {
        questions: { include: { options: true } },
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: { select: { attempts: true } }
      },
    });
  
    res.json(quiz);
  }));

  router.delete('/:quizId', requireQuizManage(), asyncHandler(async (req, res) => {
    const qid = parseInt(req.params.quizId, 10);
    await prisma.quiz.delete({ where: { id: qid } });
    res.json({ success: true });
  }));
}
