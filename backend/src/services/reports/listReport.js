import { prisma } from '../../db/prisma.js';
import { createdAtFilter } from './dateWindow.js';

/**
 * The "all rows" view of a report scope: every course / teacher / student /
 * batch / faculty as one row with its headline numbers, ready to sort and
 * filter — rather than making someone pick a subject before seeing anything.
 *
 * Everything measurable hangs off a CourseOffering, so this loads the offering
 * index once, counts each domain per offering with grouped queries, then rolls
 * those counts up to whichever entity was asked for. That keeps it to a fixed
 * handful of queries instead of one report per row.
 */

const bump = (map, key, n = 1) => {
  if (key == null) return;
  map.set(key, (map.get(key) ?? 0) + n);
};

/** Offerings plus the chain of owners each one rolls up into. */
async function loadOfferingIndex() {
  const offerings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      publicId: true,
      courseId: true,
      teacherId: true,
      sectionId: true,
      semesterId: true,
      academicYearId: true,
      course: { select: { code: true, name: true } },
      teacher: { select: { full_name: true } },
      section: {
        select: {
          name: true,
          batchId: true,
          batch: {
            select: {
              name: true,
              program: {
                select: {
                  code: true,
                  department: { select: { facultyId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return offerings.map((o) => ({
    id: o.id,
    publicId: o.publicId,
    courseId: o.courseId,
    courseCode: o.course.code,
    courseName: o.course.name,
    teacherId: o.teacherId,
    teacherName: o.teacher?.full_name ?? null,
    sectionId: o.sectionId,
    sectionName: o.section?.name ?? null,
    batchId: o.section?.batchId ?? null,
    batchName: o.section?.batch?.name ?? null,
    programCode: o.section?.batch?.program?.code ?? null,
    facultyId: o.section?.batch?.program?.department?.facultyId ?? null,
    semesterId: o.semesterId,
    academicYearId: o.academicYearId,
  }));
}

/** Per-offering counts for every domain, in a fixed number of queries. */
async function loadCountsByOffering(since, until) {
  const dateFilter = () => createdAtFilter(since, until);
  const parentCreated = createdAtFilter(since, until).created_at;
  const parentWhere = parentCreated ? { created_at: parentCreated } : {};

  const [quizzes, assignments, resources, posts, attempts, submissions] =
    await Promise.all([
      prisma.quiz.groupBy({
        by: ['courseOfferingId'],
        _count: { _all: true },
        where: dateFilter(),
      }),
      prisma.assignment.groupBy({
        by: ['courseOfferingId'],
        _count: { _all: true },
        where: dateFilter(),
      }),
      prisma.resource.groupBy({
        by: ['courseOfferingId'],
        _count: { _all: true },
        where: { courseOfferingId: { not: null }, ...dateFilter() },
      }),
      prisma.coursePost.groupBy({
        by: ['courseOfferingId'],
        _count: { _all: true },
        where: dateFilter(),
      }),
      prisma.quizAttempt.groupBy({
        by: ['quizId'],
        _count: { _all: true },
        where: parentCreated ? { quiz: parentWhere } : {},
      }),
      prisma.submission.groupBy({
        by: ['assignmentId'],
        _count: { _all: true },
        where: parentCreated ? { assignment: parentWhere } : {},
      }),
    ]);

  const [quizOwners, assignmentOwners] = await Promise.all([
    prisma.quiz.findMany({ select: { id: true, courseOfferingId: true } }),
    prisma.assignment.findMany({ select: { id: true, courseOfferingId: true } }),
  ]);
  const quizToOffering = new Map(quizOwners.map((q) => [q.id, q.courseOfferingId]));
  const assignmentToOffering = new Map(
    assignmentOwners.map((a) => [a.id, a.courseOfferingId])
  );

  const byOffering = {
    quizzes: new Map(),
    assignments: new Map(),
    resources: new Map(),
    posts: new Map(),
    attempts: new Map(),
    submissions: new Map(),
  };

  for (const r of quizzes) bump(byOffering.quizzes, r.courseOfferingId, r._count._all);
  for (const r of assignments) bump(byOffering.assignments, r.courseOfferingId, r._count._all);
  for (const r of resources) bump(byOffering.resources, r.courseOfferingId, r._count._all);
  for (const r of posts) bump(byOffering.posts, r.courseOfferingId, r._count._all);
  for (const r of attempts) {
    bump(byOffering.attempts, quizToOffering.get(r.quizId), r._count._all);
  }
  for (const r of submissions) {
    bump(byOffering.submissions, assignmentToOffering.get(r.assignmentId), r._count._all);
  }

  return byOffering;
}

/** Sum every domain across a set of offerings. */
function totals(counts, offeringIds) {
  const out = { quizzes: 0, assignments: 0, resources: 0, posts: 0, attempts: 0, submissions: 0 };
  for (const id of offeringIds) {
    for (const key of Object.keys(out)) out[key] += counts[key].get(id) ?? 0;
  }
  return out;
}

export async function listReport(scope, { since = null, until = null, teacherId = null } = {}) {
  let offerings = await loadOfferingIndex();
  // Lecturers only see rows for courses they teach (and their own teacher roll-up).
  if (teacherId != null) {
    const tid = Number(teacherId);
    offerings = offerings.filter((o) => Number(o.teacherId) === tid);
  }
  const counts = await loadCountsByOffering(since, until);

  /** Group offerings by an owner key, then emit one row per group. */
  const rollUp = (keyOf) => {
    const groups = new Map();
    for (const o of offerings) {
      const k = keyOf(o);
      if (k == null) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(o);
    }
    return groups;
  };

  if (scope === 'course') {
    return offerings.map((o) => {
      const t = totals(counts, [o.id]);
      return {
        id: o.publicId,
        course: o.courseCode,
        title: o.courseName,
        teacher: o.teacherName ?? 'Unassigned',
        batch: o.batchName ?? '—',
        section: o.sectionName ?? '—',
        quizzes: t.quizzes,
        assignments: t.assignments,
        resources: t.resources,
        // Course is the one scope that carries engagement in the list. A
        // course with content but no attempts is exactly what this report is
        // opened to find, and it should be visible without opening 47 rows
        // one at a time. The rolled-up scopes leave engagement to the detail.
        attempts: t.attempts,
        submissions: t.submissions,
      };
    });
  }

  if (scope === 'teacher') {
    const groups = rollUp((o) => o.teacherId);
    const teachers = await prisma.user.findMany({
      where: { id: { in: [...groups.keys()] } },
      select: { id: true, full_name: true, number: true, email: true },
    });
    return teachers.map((u) => {
      const mine = groups.get(u.id) ?? [];
      const t = totals(counts, mine.map((o) => o.id));
      return {
        id: u.id,
        name: u.full_name,
        staffNumber: u.number ?? u.email,
        courses: mine.length,
        quizzes: t.quizzes,
        assignments: t.assignments,
        resources: t.resources,
      };
    });
  }

  if (scope === 'student') {
    const registrations = await prisma.studentRegistration.findMany({
      where: { status: 'ACTIVE' },
      select: {
        studentId: true,
        batchSectionId: true,
        currentAcademicYearId: true,
        currentSemesterId: true,
        student: { select: { id: true, full_name: true, number: true } },
        batchSection: { select: { name: true, batch: { select: { name: true } } } },
      },
    });

    const offeringsBySection = rollUp((o) => o.sectionId);

    /** Offerings for this student's current term only (matches My Courses). */
    const currentTermOfferings = (r) =>
      (offeringsBySection.get(r.batchSectionId) ?? []).filter(
        (o) =>
          o.semesterId === r.currentSemesterId &&
          o.academicYearId === r.currentAcademicYearId
      );

    // Attempts and submissions are per person, so they cannot come from the
    // per-offering rollup — count them by student directly. They follow the
    // parent quiz/assignment's creation date, as everywhere else.
    const parentCreated = createdAtFilter(since, until).created_at;
    const parentWhere = parentCreated ? { created_at: parentCreated } : {};
    const [attemptsByStudent, submissionsByStudent] = await Promise.all([
      prisma.quizAttempt.groupBy({
        by: ['studentId'],
        _count: { _all: true },
        where: parentCreated ? { quiz: parentWhere } : undefined,
      }),
      prisma.submission.groupBy({
        by: ['studentId'],
        _count: { _all: true },
        where: parentCreated ? { assignment: parentWhere } : undefined,
      }),
    ]);
    const attemptMap = new Map(attemptsByStudent.map((r) => [r.studentId, r._count._all]));
    const submissionMap = new Map(
      submissionsByStudent.map((r) => [r.studentId, r._count._all])
    );

    const seen = new Set();
    const rows = [];
    for (const r of registrations) {
      if (seen.has(r.studentId)) continue;
      seen.add(r.studentId);
      const mine = currentTermOfferings(r);
      rows.push({
        id: r.studentId,
        name: r.student.full_name,
        studentNumber: r.student.number ?? '—',
        batch: r.batchSection?.batch?.name ?? '—',
        section: r.batchSection?.name ?? '—',
        courses: mine.length,
        attempts: attemptMap.get(r.studentId) ?? 0,
        submissions: submissionMap.get(r.studentId) ?? 0,
      });
    }
    return rows;
  }

  if (scope === 'batch') {
    const groups = rollUp((o) => o.batchId);
    const batches = await prisma.batch.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        program: { select: { code: true } },
        sections: { select: { _count: { select: { studentRegistrations: true } } } },
      },
    });
    return batches.map((b) => {
      const mine = groups.get(b.id) ?? [];
      const t = totals(counts, mine.map((o) => o.id));
      return {
        id: b.id,
        name: b.name,
        programme: b.program?.code ?? '—',
        status: b.status,
        students: b.sections.reduce((s, x) => s + x._count.studentRegistrations, 0),
        courses: mine.length,
        quizzes: t.quizzes,
        assignments: t.assignments,
      };
    });
  }

  if (scope === 'section') {
    const groups = rollUp((o) => o.sectionId);
    const sections = await prisma.batchSection.findMany({
      select: {
        id: true,
        name: true,
        batch: { select: { name: true, program: { select: { code: true } } } },
        _count: { select: { studentRegistrations: true } },
      },
    });
    return sections.map((s) => {
      const mine = groups.get(s.id) ?? [];
      const t = totals(counts, mine.map((o) => o.id));
      return {
        id: s.id,
        name: s.name,
        batch: s.batch?.name ?? '—',
        programme: s.batch?.program?.code ?? '—',
        students: s._count.studentRegistrations,
        courses: mine.length,
        quizzes: t.quizzes,
        assignments: t.assignments,
      };
    });
  }

  if (scope === 'faculty') {
    const groups = rollUp((o) => o.facultyId);
    const faculties = await prisma.faculty.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        _count: { select: { departments: true, clubs: true } },
      },
    });
    return faculties.map((f) => {
      const mine = groups.get(f.id) ?? [];
      const t = totals(counts, mine.map((o) => o.id));
      return {
        id: f.id,
        name: f.name,
        code: f.code,
        departments: f._count.departments,
        clubs: f._count.clubs,
        courses: mine.length,
        quizzes: t.quizzes,
        assignments: t.assignments,
        resources: t.resources,
      };
    });
  }

  return [];
}

/** Case-insensitive match across visible columns (`id` excluded). */
export function filterReportListRows(rows, search) {
  const raw = String(search ?? '').trim().toLowerCase();
  if (!raw) return rows;

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return rows;

  return rows.filter((row) => {
    const values = Object.entries(row)
      .filter(([k]) => k !== 'id')
      .map(([, v]) => String(v ?? '').toLowerCase());

    const combined = values.join(' ');
    if (combined.includes(raw)) return true;

    if (values.some((v) => tokens.every((t) => v.includes(t)))) return true;

    if (tokens.length === 1) {
      return values.some((v) => v.includes(tokens[0]));
    }

    // Cross-column only when every token is 2+ chars (avoids "section b" → Section A + batch B).
    if (tokens.every((t) => t.length >= 2)) {
      return tokens.every((token) => values.some((v) => v.includes(token)));
    }

    return false;
  });
}
