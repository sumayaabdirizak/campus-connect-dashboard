import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { validateBody } from '../../../middleware/validateRequest.js';
import { requireCourseOfferingManage } from '../../../middleware/courseOfferingRbac.js';
import { createQuizBodySchema } from '../../../validation/quizSchemas.js';
import { resolveModuleIdForOffering } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:courseOfferingId', requireCourseOfferingManage(), validateBody(createQuizBodySchema), asyncHandler(async (req, res) => {
    const cid = req.courseOffering.id;
    const {
      title, description, duration_minutes, is_draft, open_at, close_at,
      shuffle_questions, shuffle_answers, max_attempts, passing_score,
      timing_mode, scheduled_duration, moduleId, confidence_scoring, questions
    } = req.body;

    if (!is_draft && !(Array.isArray(questions) && questions.length > 0)) {
      return res.status(400).json({ message: 'Cannot publish a quiz with no questions' });
    }

    let resolvedModuleId;
    try {
      resolvedModuleId = await resolveModuleIdForOffering(moduleId, cid);
    } catch (e) {
      return res.status(e.status || 400).json({ message: e.message });
    }

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
        is_draft: is_draft || false,
        open_at: open_at ? new Date(open_at) : null,
        close_at: close_at ? new Date(close_at) : null,
        shuffle_questions: shuffle_questions || false,
        shuffle_answers: shuffle_answers || false,
        max_attempts: max_attempts || 1,
        passing_score: passing_score || 50,
        timing_mode: timing_mode || 'flexible',
        scheduled_duration: scheduled_duration || null,
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

    res.json(quiz);
  }));
}
