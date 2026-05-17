import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const cid = parseInt(courseOfferingId);
  
  const quizzes = await prisma.quiz.findMany({
    where: { courseOfferingId: cid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' }
      },
      _count: { select: { attempts: true } }
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(quizzes);
}));

router.post('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { 
    title, description, duration_minutes, is_draft, open_at, close_at, 
    shuffle_questions, shuffle_answers, max_attempts, passing_score,
    timing_mode, scheduled_duration
  } = req.body;
  const cid = parseInt(courseOfferingId);

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
    },
    include: {
      questions: { include: { options: true } },
      _count: { select: { attempts: true } }
    },
  });

  res.json(quiz);
}));

router.get('/:quizId', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const qid = parseInt(quizId);
  
  const quiz = await prisma.quiz.findUnique({
    where: { id: qid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' }
      },
      _count: { select: { attempts: true } }
    },
  });

  res.json(quiz);
}));

router.patch('/:quizId', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { title, description, duration_minutes, is_draft, open_at, close_at, shuffle_questions, shuffle_answers, max_attempts, passing_score, timing_mode, scheduled_duration } = req.body;
  const qid = parseInt(quizId);

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
      ...(passing_score && { passing_score }),
      ...(timing_mode && { timing_mode }),
      ...(scheduled_duration !== undefined && { scheduled_duration }),
    },
    include: {
      questions: { include: { options: true } },
      _count: { select: { attempts: true } }
    },
  });

  res.json(quiz);
}));

router.delete('/:quizId', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const qid = parseInt(quizId);

  const attempts = await prisma.quizAttempt.findMany({ where: { quizId: qid } });
  for (const attempt of attempts) {
    await prisma.quizAnswer.deleteMany({ where: { attemptId: attempt.id } });
  }
  await prisma.quizAttempt.deleteMany({ where: { quizId: qid } });
  
  const questions = await prisma.quizQuestion.findMany({ where: { quizId: qid } });
  for (const q of questions) {
    await prisma.quizOption.deleteMany({ where: { questionId: q.id } });
  }
  await prisma.quizQuestion.deleteMany({ where: { quizId: qid } });
  await prisma.quiz.delete({ where: { id: qid } });

  res.json({ success: true });
}));

// Questions CRUD
router.post('/:quizId/questions', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { question_text, question_type, points, correct_answer, options } = req.body;
  const qid = parseInt(quizId);

  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: qid },
    orderBy: { order_index: 'desc' }
  });
  const order_index = (lastQuestion?.order_index || 0) + 1;

  const question = await prisma.quizQuestion.create({
    data: {
      quizId: qid,
      question_text,
      question_type: question_type || 'MCQ',
      points: points || 1,
      correct_answer,
      order_index,
    },
    include: { options: true }
  });

  if (options && options.length > 0) {
    for (const opt of options) {
      await prisma.quizOption.create({
        data: {
          questionId: question.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct || false,
          order_index: opt.order_index || 0,
        }
      });
    }
  }

  const updatedQuestion = await prisma.quizQuestion.findUnique({
    where: { id: question.id },
    include: { options: { orderBy: { order_index: 'asc' } } }
  });

  res.json(updatedQuestion);
}));

router.patch('/questions/:questionId', auth, asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const { question_text, question_type, points, correct_answer, options } = req.body;
  const qid = parseInt(questionId);

  const question = await prisma.quizQuestion.update({
    where: { id: qid },
    data: {
      ...(question_text && { question_text }),
      ...(question_type && { question_type }),
      ...(points && { points }),
      ...(correct_answer !== undefined && { correct_answer }),
    },
  });

  if (options) {
    await prisma.quizOption.deleteMany({ where: { questionId: qid } });
    for (const opt of options) {
      await prisma.quizOption.create({
        data: {
          questionId: qid,
          option_text: opt.option_text,
          is_correct: opt.is_correct || false,
          order_index: opt.order_index || 0,
        }
      });
    }
  }

  const updatedQuestion = await prisma.quizQuestion.findUnique({
    where: { id: qid },
    include: { options: { orderBy: { order_index: 'asc' } } }
  });

  res.json(updatedQuestion);
}));

router.delete('/questions/:questionId', auth, asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const qid = parseInt(questionId);

  await prisma.quizOption.deleteMany({ where: { questionId: qid } });
  await prisma.quizQuestion.delete({ where: { id: qid } });

  res.json({ success: true });
}));

router.get('/:quizId/attempts', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const qid = parseInt(quizId);
  
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: qid },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } },
      answers: { include: { question: true } }
    },
    orderBy: { started_at: 'desc' },
  });

  res.json(attempts);
}));

router.post('/:quizId/submit', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { attemptId, answers, violations_count = 0 } = req.body;
  const studentId = req.user.id;
  const qid = parseInt(quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: qid },
    include: { questions: { include: { options: true } } }
  });

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const answer of answers) {
    const question = quiz.questions.find(q => q.id === answer.questionId);
    if (!question) continue;

    let is_correct = false;
    let points_earned = 0;

    if (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE') {
      const selectedOption = question.options.find(o => o.id === answer.selected_option_id);
      is_correct = selectedOption?.is_correct || false;
      points_earned = is_correct ? question.points : 0;
    }

    totalPoints += question.points;
    earnedPoints += points_earned;

    await prisma.quizAnswer.upsert({
      where: { id: answer.id || 0 },
      create: {
        attemptId,
        questionId: question.id,
        question_type: question.question_type,
        selected_option_id: answer.selected_option_id,
        text_answer: answer.text_answer,
        is_correct,
        points_earned,
      },
      update: {
        selected_option_id: answer.selected_option_id,
        text_answer: answer.text_answer,
        is_correct,
        points_earned,
      }
    });
  }

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const grade = quiz.passing_score ? (score >= quiz.passing_score ? score : null) : score;

  // Handle auto-close due to violations
  let closure_reason = null;
  if (violations_count >= 3) {
    closure_reason = 'violations';
  }

  const attempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      submitted_at: new Date(),
      score,
      grade,
      closure_reason,
      violations_count,
      warnings_shown: violations_count >= 3 ? 3 : violations_count
    },
    include: {
      student: { select: { id: true, full_name: true } },
      answers: true
    }
  });

  res.json(attempt);
}));

export default router;