/**
 * Verifies the live-monitor backfill fix: GET /quizzes/:quizId/attempts
 * (the endpoint the frontend now calls on mount to seed the grid) must
 * return an already-in-progress attempt with everything
 * use-quiz-live-monitor.ts needs to render a tile for it — the exact
 * scenario a teacher opening the monitor mid-quiz hits.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';
const PASSWORD = 'password123';
const COURSE_OFFERING_ID = 1914;
const STUDENT_ID = 222;

function extractCookies(r) { const raw = r.headers.get('set-cookie'); return raw ? [raw] : (r.headers.getSetCookie ? r.headers.getSetCookie() : []); }
function parseSetCookie(cookies) { const jar = {}; for (const c of cookies) { const [p] = c.split(';'); const [n, ...rest] = p.split('='); jar[n.trim()] = rest.join('='); } return jar; }
async function login(email) {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const body = await r.json();
  if (!r.ok) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(body)}`);
  const cookies = parseSetCookie(extractCookies(r));
  return { authToken: cookies.auth_token };
}
async function api(actor, path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${actor.authToken}` } });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

const results = [];
const pass = (s, d = '') => { results.push({ ok: true, s }); console.log(`[PASS] ${s}${d ? ' — ' + d : ''}`); };
const fail = (s, d = '') => { results.push({ ok: false, s }); console.log(`[FAIL] ${s} — ${d}`); };

let quiz;
try {
  quiz = await prisma.quiz.create({
    data: { title: '__TEST_MONITOR_BACKFILL quiz', duration_minutes: 20, courseOfferingId: COURSE_OFFERING_ID, timing_mode: 'flexible', is_draft: false, max_attempts: 10 },
  });
  const question = await prisma.quizQuestion.create({
    data: { quizId: quiz.id, question_text: 'Q', question_type: 'MCQ', points: 5, order_index: 0 },
  });
  const opt = await prisma.quizOption.create({
    data: { questionId: question.id, option_text: 'A', is_correct: true, order_index: 0 },
  });

  // Simulates: student started 3 minutes ago, autosaved one answer,
  // teacher has NOT opened the monitor yet (no socket event ever fired).
  const startedAt = new Date(Date.now() - 3 * 60_000);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id, studentId: STUDENT_ID, started_at: startedAt,
      expires_at: new Date(startedAt.getTime() + 20 * 60_000),
      questions_snapshot: [{ questionId: question.id, optionIds: [opt.id] }],
    },
  });
  await prisma.quizAnswer.create({
    data: { attemptId: attempt.id, questionId: question.id, question_type: 'MCQ', selected_option_id: opt.id },
  });

  const teacher = await login('lecturer.math1@university.edu');
  const res = await api(teacher, `/quizzes/${quiz.id}/attempts`);

  if (res.status === 200 && Array.isArray(res.data)) {
    pass('GET /quizzes/:quizId/attempts returns 200 array');
  } else {
    fail('GET /quizzes/:quizId/attempts returns 200 array', `status=${res.status}`);
  }

  const row = (res.data ?? []).find((a) => a.id === attempt.id);
  if (row) pass('in-progress attempt is present in the response');
  else fail('in-progress attempt is present in the response', 'not found');

  if (row && row.submitted_at === null) pass('submitted_at is null (still in progress)');
  else fail('submitted_at is null (still in progress)', String(row?.submitted_at));

  if (row && row.expires_at) pass('expires_at present', row.expires_at);
  else fail('expires_at present', 'missing — frontend backfill needs this for the countdown');

  if (row && row.student?.full_name && row.student?.id === STUDENT_ID) {
    pass('student info present', row.student.full_name);
  } else {
    fail('student info present', JSON.stringify(row?.student));
  }

  if (row && Array.isArray(row.answers) && row.answers.length === 1 && row.answers[0].selected_option_id === opt.id) {
    pass('answers array present with the autosaved answer', `answeredCount would compute to 1`);
  } else {
    fail('answers array present with the autosaved answer', JSON.stringify(row?.answers));
  }
} finally {
  if (quiz) {
    await prisma.quiz.delete({ where: { id: quiz.id } });
    console.log('\ncleanup: deleted test quiz (cascade removed question/option/attempt/answer)');
  }
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
