import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

// Get available quizzes for student
router.get('/:courseOfferingId/available', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const studentId = req.user.id;
  const now = new Date();

  const quizzes = await prisma.quiz.findMany({
    where: { 
      courseOfferingId: parseInt(courseOfferingId),
      is_draft: false,
    },
    include: {
      questions: {
        select: { id: true, question_text: true, question_type: true, points: true, order_index: true }
      },
      _count: { select: { attempts: { where: { studentId } } } }
    },
    orderBy: { created_at: 'desc' },
  });

  // Filter quizzes based on timing mode and check availability
  const available = quizzes.filter(q => {
    // Check max attempts
    if (q._count.attempts >= q.max_attempts) return false;
    
    // Check timing mode
    if (q.timing_mode === 'fixed') {
      if (q.open_at && new Date(q.open_at) > now) return false;
      if (q.close_at && new Date(q.close_at) < now) return false;
    } else {
      // Flexible mode: check legacy open_at/close_at for backward compatibility
      if (q.open_at && new Date(q.open_at) > now) return false;
      if (q.close_at && new Date(q.close_at) < now) return false;
    }
    
    return true;
  });

  res.json(available);
}));

// Start a quiz (create attempt)
router.post('/:quizId/start', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const studentId = req.user.id;
  const now = new Date();
  
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId) },
    include: {
      questions: {
        include: {
          options: { orderBy: { order_index: 'asc' } }
        }
      }
    }
  });

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  // Check if already at max attempts
  const existingAttempts = await prisma.quizAttempt.count({
    where: { quizId: parseInt(quizId), studentId }
  });

  if (existingAttempts >= quiz.max_attempts) {
    return res.status(400).json({ error: 'Maximum attempts reached' });
  }

  // Check timing mode
  if (quiz.timing_mode === 'fixed') {
    if (quiz.open_at && new Date(quiz.open_at) > now) {
      return res.status(400).json({ error: 'Quiz not open yet', open_at: quiz.open_at });
    }
    if (quiz.close_at && new Date(quiz.close_at) < now) {
      return res.status(400).json({ error: 'Quiz closed' });
    }
  } else {
    // Flexible mode: check legacy open_at/close_at for backward compatibility
    if (quiz.open_at && new Date(quiz.open_at) > now) {
      return res.status(400).json({ error: 'Quiz not open yet', open_at: quiz.open_at });
    }
    if (quiz.close_at && new Date(quiz.close_at) < now) {
      return res.status(400).json({ error: 'Quiz closed' });
    }
  }

  // Find existing in-progress attempt
  let attempt = await prisma.quizAttempt.findFirst({
    where: { quizId: parseInt(quizId), studentId, submitted_at: null },
    orderBy: { started_at: 'desc' }
  });

  // If no in-progress attempt, create new one
  if (!attempt) {
    attempt = await prisma.quizAttempt.create({
      data: {
        quizId: parseInt(quizId),
        studentId,
      },
    });
  }

  // Shuffle questions if enabled
  let questions = quiz.questions;
  if (quiz.shuffle_questions) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  // Hide correct answers from student view
  const studentQuestions = questions.map(q => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    points: q.points,
    order_index: q.order_index,
    options: q.shuffle_answers 
      ? q.options.sort(() => Math.random() - 0.5)
      : q.options.map(o => ({ id: o.id, option_text: o.option_text }))
  }));

  // Calculate duration based on timing mode
  const durationMinutes = quiz.timing_mode === 'fixed' && quiz.scheduled_duration 
    ? quiz.scheduled_duration 
    : quiz.duration_minutes;

  // Get violations from any previous attempts
  const previousAttempts = await prisma.quizAttempt.findMany({
    where: { quizId: parseInt(quizId), studentId },
    select: { violations_count: true, warnings_shown: true }
  });
  const totalViolations = previousAttempts.reduce((sum, a) => sum + (a.violations_count || 0), 0);
  const totalWarnings = previousAttempts.reduce((sum, a) => sum + (a.warnings_shown || 0), 0);

  res.json({
    attempt: {
      id: attempt.id,
      violations_count: totalViolations,
      warnings_shown: totalWarnings
    },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      duration_minutes: durationMinutes,
      passing_score: quiz.passing_score,
      timing_mode: quiz.timing_mode,
      open_at: quiz.open_at,
      close_at: quiz.close_at
    },
    questions: studentQuestions,
    totalQuestions: questions.length,
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0)
  });
}));

// Get attempt status
router.get('/attempts/:attemptId', auth, asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parseInt(attemptId) },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
            orderBy: { order_index: 'asc' }
          }
        }
      },
      student: { select: { id: true, full_name: true, number: true } },
      answers: true
    },
  });

  res.json(attempt);
}));

// Grade attempt (for short answer questions)
router.patch('/attempts/:attemptId/grade', auth, asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const { answers } = req.body; // [{ answerId, score, is_correct }]

  let totalScore = 0;
  let totalPoints = 0;

  for (const grade of answers) {
    if (grade.points_earned !== undefined) {
      await prisma.quizAnswer.update({
        where: { id: grade.answerId },
        data: {
          is_correct: grade.is_correct,
          points_earned: grade.points_earned,
        }
      });
      totalScore += grade.points_earned || 0;
    }
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parseInt(attemptId) },
    include: { quiz: true, answers: true }
  });

  totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
  const score = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

  await prisma.quizAttempt.update({
    where: { id: parseInt(attemptId) },
    data: { score, is_graded: true }
  });

  res.json({ success: true, score });
}));

export default router;