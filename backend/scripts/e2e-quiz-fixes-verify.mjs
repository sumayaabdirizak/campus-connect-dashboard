/**
 * Verifies both quiz fixes against the real running backend + real DB,
 * using a synthetic quiz built on an existing course offering (cascade
 * deletes clean it all up afterward).
 *
 * Fix 1: submit after expires_at must ignore the request body's answers
 * and finalize with only what was already persisted, closure_reason
 * 'time_expired'.
 *
 * Fix 2: grading points_earned must clamp to the question's own point
 * value, not the schema's flat 0-100 bound.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';
const PASSWORD = 'password123';

function extractCookies(r) { const raw = r.headers.get('set-cookie'); return raw ? [raw] : (r.headers.getSetCookie ? r.headers.getSetCookie() : []); }
function parseSetCookie(cookies) { const jar = {}; for (const c of cookies) { const [p] = c.split(';'); const [n, ...rest] = p.split('='); jar[n.trim()] = rest.join('='); } return jar; }
function cookieHeader(jar) { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }
async function login(email) {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const body = await r.json();
  if (!r.ok) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(body)}`);
  const cookies = parseSetCookie(extractCookies(r));
  return { authToken: cookies.auth_token, csrfToken: body.csrfToken || cookies.csrf_token, csrfCookie: cookies.csrf_token };
}
async function api(actor, path, { method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${actor.authToken}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = actor.csrfToken;
    headers.Cookie = cookieHeader({ csrf_token: actor.csrfCookie || actor.csrfToken, auth_token: actor.authToken });
  }
  const r = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

const results = [];
const pass = (s, d = '') => { results.push({ ok: true, s }); console.log(`[PASS] ${s}${d ? ' — ' + d : ''}`); };
const fail = (s, d = '') => { results.push({ ok: false, s }); console.log(`[FAIL] ${s} — ${d}`); };

let quiz;
try {
  const COURSE_OFFERING_ID = 1914;
  const STUDENT_ID = 222;

  quiz = await prisma.quiz.create({
    data: {
      title: '__TEST_FIX_VERIFY quiz',
      duration_minutes: 10,
      courseOfferingId: COURSE_OFFERING_ID,
      timing_mode: 'flexible',
      is_draft: false,
      max_attempts: 10,
    },
  });
  const question = await prisma.quizQuestion.create({
    data: { quizId: quiz.id, question_text: 'Test Q', question_type: 'MCQ', points: 5, order_index: 0 },
  });
  const correctOpt = await prisma.quizOption.create({
    data: { questionId: question.id, option_text: 'Correct', is_correct: true, order_index: 0 },
  });
  const wrongOpt = await prisma.quizOption.create({
    data: { questionId: question.id, option_text: 'Wrong', is_correct: false, order_index: 1 },
  });

  // ── Fix 1: expiry ──────────────────────────────────────────────────
  const pastExpiry = new Date(Date.now() - 60_000);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      studentId: STUDENT_ID,
      started_at: new Date(Date.now() - 15 * 60_000),
      expires_at: pastExpiry,
      questions_snapshot: [{ questionId: question.id, optionIds: [correctOpt.id, wrongOpt.id] }],
    },
  });
  // Simulate a legitimately-autosaved answer from before the deadline.
  const legitAnswer = await prisma.quizAnswer.create({
    data: {
      attemptId: attempt.id,
      questionId: question.id,
      question_type: 'MCQ',
      selected_option_id: correctOpt.id,
    },
  });

  const student = await login('student.bsc-math-b1.section-a.10@university.edu');

  // Attempt to smuggle in a DIFFERENT (wrong) answer for the same question,
  // after the deadline has passed.
  const submitRes = await api(student, `/quizzes/${quiz.id}/submit`, {
    method: 'POST',
    body: {
      attemptId: attempt.id,
      answers: [{ questionId: question.id, selectedOptionId: wrongOpt.id }],
      violations_count: 0,
    },
  });

  if (submitRes.status === 200) pass('POST /submit after expiry returns 200', `status=${submitRes.status}`);
  else fail('POST /submit after expiry returns 200', `status=${submitRes.status} body=${JSON.stringify(submitRes.data)}`);

  const closureReason = submitRes.data?.closure_reason;
  if (closureReason === 'time_expired') pass('response closure_reason', 'time_expired');
  else fail('response closure_reason', String(closureReason));

  const persistedAnswer = await prisma.quizAnswer.findUnique({ where: { id: legitAnswer.id } });
  if (persistedAnswer.selected_option_id === correctOpt.id) {
    pass('late answer NOT persisted', 'original autosaved answer unchanged');
  } else {
    fail('late answer NOT persisted', `selected_option_id is now ${persistedAnswer.selected_option_id}, expected original ${correctOpt.id} (late payload was ${wrongOpt.id})`);
  }

  const noNewAnswerRow = await prisma.quizAnswer.count({ where: { attemptId: attempt.id } });
  if (noNewAnswerRow === 1) pass('no duplicate/new answer row created', `count=${noNewAnswerRow}`);
  else fail('no duplicate/new answer row created', `count=${noNewAnswerRow}, expected 1`);

  const attemptAfter = await prisma.quizAttempt.findUnique({ where: { id: attempt.id } });
  if (attemptAfter.submitted_at) pass('attempt closed (submitted_at set)');
  else fail('attempt closed (submitted_at set)', 'still null');
  // Correct answer was legitimately autosaved and untouched -> full score.
  if (attemptAfter.score === 100) pass('score reflects only the legit pre-expiry answer', `score=${attemptAfter.score}`);
  else fail('score reflects only the legit pre-expiry answer', `score=${attemptAfter.score}, expected 100`);

  // ── Fix 2: grade clamp ─────────────────────────────────────────────
  const teacher = await login('lecturer.math1@university.edu');
  const gradeRes = await api(teacher, `/quiz-taking/attempts/${attempt.id}/grade`, {
    method: 'PATCH',
    body: { answers: [{ answerId: legitAnswer.id, points_earned: 100, is_correct: true }] },
  });
  if (gradeRes.status === 200) pass('PATCH /grade returns 200');
  else fail('PATCH /grade returns 200', `status=${gradeRes.status} body=${JSON.stringify(gradeRes.data)}`);

  const gradedAnswer = await prisma.quizAnswer.findUnique({ where: { id: legitAnswer.id } });
  if (gradedAnswer.points_earned === 5) {
    pass('points_earned clamped to question.points', `sent 100, question worth 5, stored ${gradedAnswer.points_earned}`);
  } else {
    fail('points_earned clamped to question.points', `stored ${gradedAnswer.points_earned}, expected 5 (clamped from 100)`);
  }

  const attemptAfterGrade = await prisma.quizAttempt.findUnique({ where: { id: attempt.id } });
  if (attemptAfterGrade.score <= 100) pass('attempt.score did not exceed 100', `score=${attemptAfterGrade.score}`);
  else fail('attempt.score did not exceed 100', `score=${attemptAfterGrade.score}`);
} finally {
  if (quiz) {
    await prisma.quiz.delete({ where: { id: quiz.id } }); // cascades questions/options/attempts/answers
    console.log('\ncleanup: deleted test quiz (cascade removed question/options/attempt/answers)');
  }
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
