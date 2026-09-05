import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { createQuizBodySchema } from '../../../validation/quizSchemas.js';
import { resolveModuleIdForOffering, assertQuestionsAllowedForMode, assertMarksPlanAllowedForMode, normalizeOfflineDelivery } from './helpers.js';
import { notifyQuizPublished } from './notifyStudents.js';
import {
  getCourseMarkBudget,
  MARK_BUDGET_FULL_MESSAGE,
  reserveCourseMarkWeight,
  resolveQuizCourseMarks,
} from '../../../services/courses/courseMarkBudget.service.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:courseOfferingId', requireCourseOfferingManage(), validateBody(createQuizBodySchema), asyncHandler(async (req, res) => {
    const cid = req.courseOffering.id;
    const {
      title, description, duration_minutes, is_draft, open_at, close_at,
      shuffle_questions, shuffle_answers, max_attempts, passing_score,
      timing_mode, scheduled_duration,       mode, marksPlan, moduleId, confidence_scoring, questions,
      auto_publish_at_open,
      maxMarks,
      offline_delivery,
    } = req.body;

    const schedulePublish = !!auto_publish_at_open;
    const draft = schedulePublish ? true : (is_draft || false);
    const quizMode = mode || 'online';
    const delivery = normalizeOfflineDelivery(quizMode, offline_delivery);
    const isUploaded = delivery === 'uploaded';

    if (!draft) {
      if (isUploaded) {
        const weightHint = maxMarks ?? marksPlan?.totalMarks ?? 0;
        if (!weightHint || weightHint < 1) {
          return res.status(400).json({
            message: 'Set course marks for this uploaded quiz before publishing.',
          });
        }
      } else if (!(Array.isArray(questions) && questions.length > 0)) {
        return res.status(400).json({ message: 'Cannot publish a quiz with no questions' });
      }
    }
    if (schedulePublish && !open_at) {
      return res.status(400).json({ message: 'Scheduled publish requires an open time' });
    }

    let resolvedModuleId;
    try {
      resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
    } catch (e) {
      return res.status(e.status || 400).json({ message: e.message });
    }

    const quizModeResolved = quizMode;
    assertMarksPlanAllowedForMode(quizModeResolved, marksPlan);
    assertQuestionsAllowedForMode(quizModeResolved, questions);

    const nestedQuestions =
      Array.isArray(questions) && questions.length > 0
        ? {
            create: questions.map((q, i) => ({
              question_text: q.question_text,
              question_type: q.question_type || 'MCQ',
              points: q.points ?? 1,
              correct_answer: q.correct_answer ?? null,
              explanation: q.explanation ?? null,
              order_index: i,
              options:
                q.question_type !== 'SHORT_ANSWER' && q.options?.length
                  ? {
                      create: q.options.map((o, idx) => ({
                        option_text: o.option_text,
                        is_correct: !!o.is_correct,
                        order_index: o.order_index ?? idx,
                      })),
                    }
                  : undefined,
            })),
          }
        : undefined;

    const questionPointsSum = isUploaded
      ? 0
      : Array.isArray(questions)
        ? questions.reduce((s, q) => s + (q.points ?? 1), 0)
        : 0;
    const courseWeight = !draft
      ? resolveQuizCourseMarks({ maxMarks, marksPlan, questionPointsSum })
      : isUploaded && Number(maxMarks) > 0
        ? Number(maxMarks)
        : 0;

    if (!draft && courseWeight <= 0) {
      return res.status(400).json({
        message:
          'Set course marks for this quiz (marks plan total or maxMarks) before publishing.',
      });
    }

    const budget = await getCourseMarkBudget(cid);
    if (budget.remaining <= 0) {
      return res.status(400).json({ message: MARK_BUDGET_FULL_MESSAGE });
    }

    let finalCourseWeight = courseWeight;
    let markBudgetNotice = null;
    if (courseWeight > 0) {
      const reserved = await reserveCourseMarkWeight(cid, courseWeight);
      if (reserved.error) return res.status(400).json({ message: reserved.error });
      finalCourseWeight = reserved.data.marks;
      if (reserved.data.clamped) markBudgetNotice = reserved.data.clampMessage;
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        duration_minutes: duration_minutes || 30,
        courseOfferingId: cid,
        is_draft: draft,
        auto_publish_at_open: schedulePublish,
        maxMarks: finalCourseWeight,
        open_at: open_at ? new Date(open_at) : null,
        close_at: close_at ? new Date(close_at) : null,
        shuffle_questions: shuffle_questions || false,
        shuffle_answers: shuffle_answers || false,
        max_attempts: max_attempts || 1,
        passing_score: passing_score || 50,
        timing_mode: timing_mode || 'flexible',
        mode: quizModeResolved,
        offline_delivery: delivery,
        marksPlan: isUploaded ? null : (marksPlan ?? undefined),
        // UI no longer sets a separate scheduled duration — always null.
        scheduled_duration: scheduled_duration ?? null,
        confidence_scoring: !!confidence_scoring,
        ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
        ...(nestedQuestions && { questions: nestedQuestions }),
      },
      include: {
        questions: { include: { options: true } },
        paperFile: true,
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: { select: { attempts: true } }
      },
    });

    if (!quiz.is_draft) {
      notifyQuizPublished(quiz, req.courseOffering.publicId);
    }

    res.json({
      ...quiz,
      ...(markBudgetNotice ? { markBudgetNotice } : {}),
    });
  }));
}
