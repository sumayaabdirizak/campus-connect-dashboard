/**
 * Verifies both question-bank fixes against the real running backend.
 *
 * Fix 1: GET /api/question-bank/:courseOfferingId must reject a student
 * and still work for the teacher who owns the offering.
 *
 * Fix 2: POST /api/question-bank/:courseOfferingId/generate must 429 after
 * 15 requests within the hour window, per user.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';
const PASSWORD = 'password123';
const COURSE_OFFERING_ID = 1914;

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

let bankQuestion;
try {
  bankQuestion = await prisma.question.create({
    data: {
      question_text: '__TEST_FIX_VERIFY bank question',
      question_type: 'MCQ',
      points: 5,
      courseOfferingId: COURSE_OFFERING_ID,
      created_by: 9,
      bankOptions: {
        create: [
          { option_text: 'Correct', is_correct: true, order_index: 0 },
          { option_text: 'Wrong', is_correct: false, order_index: 1 },
        ],
      },
    },
  });

  // ── Fix 1: bank list access ─────────────────────────────────────────
  const student = await login('student.bsc-math-b1.section-a.10@university.edu');
  const teacher = await login('lecturer.math1@university.edu');

  const studentListRes = await api(student, `/question-bank/${COURSE_OFFERING_ID}`);
  if (studentListRes.status === 403) {
    pass('student blocked from GET /question-bank/:id', `status=${studentListRes.status}`);
  } else {
    fail('student blocked from GET /question-bank/:id', `status=${studentListRes.status} body=${JSON.stringify(studentListRes.data).slice(0,200)}`);
  }

  const studentTopicsRes = await api(student, `/question-bank/${COURSE_OFFERING_ID}/topics`);
  if (studentTopicsRes.status === 403) {
    pass('student blocked from GET /question-bank/:id/topics', `status=${studentTopicsRes.status}`);
  } else {
    fail('student blocked from GET /question-bank/:id/topics', `status=${studentTopicsRes.status}`);
  }

  const teacherListRes = await api(teacher, `/question-bank/${COURSE_OFFERING_ID}`);
  if (teacherListRes.status === 200 && Array.isArray(teacherListRes.data)) {
    const found = teacherListRes.data.find((q) => q.id === bankQuestion.id);
    if (found) pass('teacher (owner) still sees the bank, including the test question');
    else fail('teacher (owner) still sees the bank, including the test question', 'test question not in response');
  } else {
    fail('teacher can still list the bank', `status=${teacherListRes.status}`);
  }

  // ── Fix 2: AI generate rate limit ───────────────────────────────────
  // Body is deliberately invalid (fails validateBody) — irrelevant, since
  // the limiter sits ahead of validation and counts every request that
  // reaches it, pass or fail downstream.
  let sawTooMany = false;
  let lastStatus = null;
  for (let i = 0; i < 16; i++) {
    const r = await api(teacher, `/question-bank/${COURSE_OFFERING_ID}/generate`, {
      method: 'POST',
      body: { prompt: 'x' }, // missing required sourceMaterial -> fails validation downstream
    });
    lastStatus = r.status;
    if (r.status === 429) { sawTooMany = true; break; }
  }
  if (sawTooMany) pass('16th AI-generate request in the window is rate-limited', 'got 429');
  else fail('16th AI-generate request in the window is rate-limited', `never saw 429, last status=${lastStatus}`);
} finally {
  if (bankQuestion) {
    await prisma.question.delete({ where: { id: bankQuestion.id } }); // cascades bankOptions
    console.log('\ncleanup: deleted test bank question (cascade removed options)');
  }
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
