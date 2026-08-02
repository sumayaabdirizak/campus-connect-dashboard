import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.E2E_API_BASE_URL || 'http://localhost:4000/api';
const PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function parseSetCookie(cookies) {
  const jar = {};
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const [name, ...rest] = pair.split('=');
    jar[name.trim()] = rest.join('=');
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function login(email) {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Login ${email}: ${response.status} ${body.message || ''}`);
  }
  const cookies = parseSetCookie(extractCookies(response));
  return {
    email,
    authToken: cookies.auth_token,
    csrfToken: body.csrfToken || cookies.csrf_token,
    csrfCookie: cookies.csrf_token || body.csrfToken,
    cookieJar: cookies,
  };
}

async function api(actor, path, { method = 'GET', body } = {}) {
  const headers = {
    Authorization: `Bearer ${actor.authToken}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && method !== 'HEAD') {
    headers['X-CSRF-Token'] = actor.csrfToken || actor.csrfCookie;
    headers.Cookie = cookieHeader({
      csrf_token: actor.csrfCookie || actor.csrfToken,
      auth_token: actor.authToken,
    });
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function main() {
  const results = [];
  const pass = (step, detail = '') => {
    results.push({ ok: true, step, detail });
    console.log(`[PASS] ${step}${detail ? ` — ${detail}` : ''}`);
  };
  const fail = (step, detail = '') => {
    results.push({ ok: false, step, detail });
    console.log(`[FAIL] ${step} — ${detail}`);
  };

  let teacherRow =
    (await prisma.user.findFirst({
      where: {
        email: 'lecturer.math1@university.edu',
        role: { name: 'TEACHER' },
      },
      select: { id: true, email: true },
    })) ||
    (await prisma.user.findFirst({
      where: {
        email: { startsWith: 'lecturer.math' },
        role: { name: 'TEACHER' },
      },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    }));
  const studentRow = await prisma.user.findFirst({
    where: { id: 96 },
    select: { id: true, email: true },
  });

  if (!teacherRow?.email || !studentRow?.email) {
    fail('accounts', 'missing teacher or student 96');
    process.exit(1);
  }
  pass('accounts', `teacher=${teacherRow.email} student=${studentRow.email}`);

  // Prefer a course both can use (same batch section)
  let offering = await prisma.courseOffering.findFirst({
    where: {
      teacherId: teacherRow.id,
      section: {
        studentRegistrations: {
          some: { studentId: studentRow.id, status: 'ACTIVE' },
        },
      },
    },
    include: { course: { select: { code: true } }, section: { select: { name: true } } },
  });

  if (!offering) {
    offering = await prisma.courseOffering.findFirst({
      where: {
        teacherId: { not: null },
        section: {
          studentRegistrations: {
            some: { studentId: studentRow.id, status: 'ACTIVE' },
          },
        },
      },
      include: {
        course: { select: { code: true } },
        section: { select: { name: true } },
        teacher: { select: { id: true, email: true } },
      },
    });
    if (offering?.teacher) {
      teacherRow = offering.teacher;
    }
  }

  if (!offering?.publicId) {
    fail('offering', 'no shared course offering');
    process.exit(1);
  }
  pass(
    'offering',
    `${offering.course.code} / ${offering.section?.name} (${offering.publicId}) teacher=${teacherRow.email}`
  );

  const teacher = await login(teacherRow.email);
  pass('teacher login');
  const student = await login(studentRow.email);
  pass('student login');

  const listT = await api(teacher, `/course-offerings/${offering.publicId}`);
  if (!listT.ok) fail('teacher list', `${listT.status} ${JSON.stringify(listT.data)}`);
  else pass('teacher list', `${(listT.data || []).length} items`);

  const title = `E2E Assign ${Date.now()}`;
  const created = await api(teacher, `/course-offerings/${offering.publicId}`, {
    method: 'POST',
    body: {
      title,
      description: 'Automated workflow test',
      due_date: new Date(Date.now() + 7 * 864e5).toISOString(),
      is_draft: true,
      workMode: 'INDIVIDUAL',
      gradingScope: 'INDIVIDUAL',
      maxMarks: 100,
    },
  });
  if (!created.ok || !created.data?.id) {
    fail('create draft', `${created.status} ${JSON.stringify(created.data)}`);
    process.exit(1);
  }
  const assignmentId = created.data.id;
  pass('create draft', `id=${assignmentId}`);

  const listS1 = await api(student, `/course-offerings/${offering.publicId}`);
  if (!listS1.ok) fail('student list (pre-publish)', `${listS1.status}`);
  else if ((listS1.data || []).some((a) => a.id === assignmentId)) {
    fail('hide draft from student', 'draft was visible');
  } else pass('hide draft from student');

  const published = await api(teacher, `/course-offerings/${assignmentId}`, {
    method: 'PATCH',
    body: { is_draft: false },
  });
  if (!published.ok || published.data?.is_draft) {
    fail('publish', `${published.status} ${JSON.stringify(published.data)}`);
  } else pass('publish');

  const listS2 = await api(student, `/course-offerings/${offering.publicId}`);
  if (!listS2.ok || !(listS2.data || []).some((a) => a.id === assignmentId)) {
    fail('student sees published', `${listS2.status}`);
  } else pass('student sees published');

  const summary = await api(
    student,
    `/course-offerings/course/${offering.publicId}/my-summary`
  );
  if (!summary.ok) fail('student summary', `${summary.status} ${JSON.stringify(summary.data)}`);
  else pass('student summary', `published=${summary.data?.totalPublished}`);

  const submit = await api(student, `/course-offerings/${assignmentId}/submissions`, {
    method: 'POST',
    body: { link: 'https://example.com/my-work' },
  });
  if (!submit.ok) fail('student submit', `${submit.status} ${JSON.stringify(submit.data)}`);
  else pass('student submit', `id=${submit.data?.id}`);

  const mine = await api(student, `/course-offerings/${assignmentId}/my-submission`);
  if (!mine.ok || !mine.data?.id) {
    fail('my-submission', `${mine.status}`);
  } else pass('my-submission', `id=${mine.data.id}`);

  const subs = await api(teacher, `/course-offerings/${assignmentId}/submissions`);
  if (!subs.ok || !(subs.data || []).length) {
    fail('teacher submissions', `${subs.status}`);
  } else pass('teacher submissions', `count=${subs.data.length}`);

  const submissionId = submit.data?.id || mine.data?.id;
  const grade = await api(
    teacher,
    `/course-offerings/${assignmentId}/submissions/${submissionId}`,
    {
      method: 'PATCH',
      body: { grade: 88, feedback: 'E2E grade', is_reviewed: true },
    }
  );
  if (!grade.ok || Number(grade.data?.grade) !== 88) {
    fail('grade', `${grade.status} ${JSON.stringify(grade.data)}`);
  } else pass('grade', '88');

  const deleted = await api(teacher, `/course-offerings/${assignmentId}`, {
    method: 'DELETE',
  });
  if (!deleted.ok) fail('cleanup', `${deleted.status}`);
  else pass('cleanup');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
