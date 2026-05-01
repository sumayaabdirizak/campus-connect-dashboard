import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

// Get all questions in the bank
router.get('/', auth, asyncHandler(async (req, res) => {
  const { topic, difficulty, course_code, search } = req.query;
  const teacherId = req.user.id;
  
  const where = { is_active: true };
  
  if (topic) where.topic = topic;
  if (difficulty) where.difficulty = difficulty;
  if (course_code) where.course_code = course_code;
  if (search) {
    where.question_text = { contains: search, mode: 'insensitive' };
  }
  
  // Teachers can see their own questions and active questions
  where.OR = [
    { created_by: teacherId },
    { is_active: true }
  ];

  const questions = await prisma.question.findMany({
    where,
    include: {
      bankOptions: { orderBy: { order_index: 'asc' } }
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(questions);
}));

// Create a new question
router.post('/', auth, asyncHandler(async (req, res) => {
  const { question_text, question_type, points, course_code, topic, difficulty, options } = req.body;
  const teacherId = req.user.id;

  const question = await prisma.question.create({
    data: {
      question_text,
      question_type: question_type || 'MCQ',
      points: points || 1,
      course_code,
      topic,
      difficulty,
      created_by: teacherId,
      bankOptions: {
        create: options?.map((opt, idx) => ({
          option_text: opt.option_text,
          is_correct: opt.is_correct || false,
          order_index: idx
        })) || []
      }
    },
    include: {
      bankOptions: { orderBy: { order_index: 'asc' } }
    }
  });

  res.json(question);
}));

// Update a question
router.patch('/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question_text, question_type, points, course_code, topic, difficulty, options, is_active } = req.body;
  const teacherId = req.user.id;

  // Check ownership
  const existing = await prisma.question.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (existing.created_by !== teacherId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Update question
  const question = await prisma.question.update({
    where: { id: parseInt(id) },
    data: {
      question_text,
      question_type,
      points,
      course_code,
      topic,
      difficulty,
      is_active
    }
  });

  // Update options if provided
  if (options) {
    // Delete existing options
    await prisma.questionOptionBank.deleteMany({
      where: { questionId: parseInt(id) }
    });

    // Create new options
    await prisma.questionOptionBank.createMany({
      data: options.map((opt, idx) => ({
        questionId: parseInt(id),
        option_text: opt.option_text,
        is_correct: opt.is_correct || false,
        order_index: idx
      }))
    });
  }

  const updated = await prisma.question.findUnique({
    where: { id: parseInt(id) },
    include: {
      bankOptions: { orderBy: { order_index: 'asc' } }
    }
  });

  res.json(updated);
}));

// Delete (soft) a question
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.id;

  const existing = await prisma.question.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (existing.created_by !== teacherId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await prisma.question.update({
    where: { id: parseInt(id) },
    data: { is_active: false }
  });

  res.json({ success: true });
}));

// Get unique topics
router.get('/topics', auth, asyncHandler(async (req, res) => {
  const topics = await prisma.question.groupBy({
    by: ['topic'],
    where: { is_active: true, topic: { not: null } },
    _count: { topic: true }
  });

  res.json(topics.map(t => ({ name: t.topic, count: t._count.topic })));
}));

// Import questions from CSV
router.post('/import', auth, asyncHandler(async (req, res) => {
  const { questions } = req.body;
  const teacherId = req.user.id;
  
  const results = [];
  
  for (const q of questions) {
    const question = await prisma.question.create({
      data: {
        question_text: q.question_text,
        question_type: q.question_type || 'MCQ',
        points: q.points || 1,
        course_code: q.course_code || null,
        topic: q.topic || null,
        difficulty: q.difficulty || null,
        created_by: teacherId,
        bankOptions: {
          create: q.options?.map((opt, idx) => ({
            option_text: opt.option_text,
            is_correct: opt.is_correct || false,
            order_index: idx
          })) || []
        }
      },
      include: {
        bankOptions: { orderBy: { order_index: 'asc' } }
      }
    });
    results.push(question);
  }
  
  res.json({ success: true, imported: results.length });
}));

// Import questions from bank to a quiz
router.post('/import/:quizId', auth, asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { questionIds } = req.body;
  const qid = parseInt(quizId);

  // Get the quiz
  const quiz = await prisma.quiz.findUnique({
    where: { id: qid }
  });

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  // Get the last question order_index
  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: qid },
    orderBy: { order_index: 'desc' }
  });
  let order_index = (lastQuestion?.order_index || 0);

  const addedQuestions = [];

  for (const bankQ of questionIds) {
    const bankQuestion = await prisma.question.findUnique({
      where: { id: bankQ.id },
      include: { bankOptions: { orderBy: { order_index: 'asc' } } }
    });

    if (!bankQuestion) continue;

    order_index++;

    // Create question in quiz
    const newQuestion = await prisma.quizQuestion.create({
      data: {
        quizId: qid,
        question_text: bankQuestion.question_text,
        question_type: bankQuestion.question_type,
        points: bankQuestion.points,
        order_index,
      },
      include: { options: true }
    });

    // Copy options from bank
    for (const opt of bankQuestion.bankOptions) {
      await prisma.quizOption.create({
        data: {
          questionId: newQuestion.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct || false,
          order_index: opt.order_index,
        }
      });
    }

    addedQuestions.push(newQuestion.id);
  }

  const updatedQuiz = await prisma.quiz.findUnique({
    where: { id: qid },
    include: {
      questions: {
        include: { options: { orderBy: { order_index: 'asc' } } },
        orderBy: { order_index: 'asc' }
      }
    }
  });

  res.json({ success: true, added: addedQuestions.length, quiz: updatedQuiz });
}));

export default router;