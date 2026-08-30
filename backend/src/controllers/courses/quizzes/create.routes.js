import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { createQuizBodySchema } from '../../../validation/quizSchemas.js';
import { resolveModuleIdForOffering, assertQuestionsAllowedForMode, assertMarksPlanAllowedForMode } from './helpers.js';
import { notifyQuizPublished } from './notifyStudents.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:courseOfferingId', requireCourseOfferingManage(), validateBody(createQuizBodySchema), asyncHandler(async (req, res) => {
    const cid = req.courseOffering.id;
    const {
      title, description, duration_minutes, is_draft, open_at, close_at,
      shuffle_questions, shuffle_answers, max_attempts, passing_score,
      timing_mode, scheduled_duration, mode, marksPlan, moduleId, confidence_scoring, questions,
      auto_publish_at_open,
    } = req.body;

    const schedulePublish = !!auto_publish_at_open;
    const draft = schedulePublish ? true : (is_draft || false);

    if (!draft && !(Array.isArray(questions) && questions.length > 0)) {
      return res.status(400).json({ message: 'Cannot publish a quiz with no questions' });
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

    const quizMode = mode || 'online';
    assertMarksPlanAllowedForMode(quizMode, marksPlan);
    assertQuestionsAllowedForMode(quizMode, questions);

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

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        duration_minutes: duration_minutes || 30,
        courseOfferingId: cid,
        is_draft: draft,
        auto_publish_at_open: schedulePublish,
        open_at: open_at ? new Date(open_at) : null,
        close_at: close_at ? new Date(close_at) : null,
        shuffle_questions: shuffle_questions || false,
        shuffle_answers: shuffle_answers || false,
        max_attempts: max_attempts || 1,
        passing_score: passing_score || 50,
        timing_mode: timing_mode || 'flexible',
        mode: mode || 'online',
        marksPlan: marksPlan ?? undefined,
        // UI no longer sets a separate scheduled duration — always null.
        scheduled_duration: scheduled_duration ?? null,
        confidence_scoring: !!confidence_scoring,
        ...(resolvedModuleId !== undefined && { moduleId: resolvedModuleId }),
        ...(nestedQuestions && { questions: nestedQuestions }),
      },
      include: {
        questions: { include: { options: true } },
        module: { select: { id: true, title: true, position: true, publishedAt: true } },
        _count: { select: { attempts: true } }
      },
    });

    if (!quiz.is_draft) {
      notifyQuizPublished(quiz, req.courseOffering.publicId);
    }

    res.json(quiz);
  }));
}
