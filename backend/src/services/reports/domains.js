import { prisma } from '../../db/prisma.js';
import { createdAtFilter } from './dateWindow.js';

/**
 * One aggregator per activity domain. Each takes the resolved scope plus a
 * period start and returns `{ kpis, rows }` — `kpis` are the headline numbers,
 * `rows` a small table the UI can render and export without further shaping.
 *
 * All of them tolerate an empty offering set: a brand-new batch with no
 * courses yet should render zeroes, not throw.
 */

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Human labels for the ResourceType enum. Kept in step with the resource form
 * (`typeSelectOptions`) — a report that says LECTURE_NOTE while the rest of
 * the app says "File" reads as a different system.
 */
const RESOURCE_TYPE_LABEL = {
  LECTURE_NOTE: 'File',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  EXTERNAL_LINK: 'Link',
  OTHER: 'Other',
  SYLLABUS: 'Syllabus',
  ASSIGNMENT: 'Assignment',
};

const resourceTypeLabel = (t) => RESOURCE_TYPE_LABEL[t] ?? t;

export async function quizzesDomain({ offeringIds, studentIds }, window = {}) {
  const { since, until } = window;
  if (offeringIds.length === 0) return { kpis: [], rows: [] };

  const quizzes = await prisma.quiz.findMany({
    where: {
      courseOfferingId: { in: offeringIds },
      ...createdAtFilter(since, until),
    },
    select: {
      id: true,
      title: true,
      is_draft: true,
      mode: true,
      created_at: true,
      _count: { select: { questions: true, attempts: true } },
      courseOffering: { select: { course: { select: { code: true } } } },
    },
    orderBy: { created_at: 'desc' },
  });

  const quizIds = quizzes.map((q) => q.id);

  // Attempts hang off the quizzes above rather than being dated separately,
  // so every attempt counted belongs to a row on screen and the table always
  // sums to the KPI. No `started_at` bound is needed: an attempt cannot
  // predate its quiz, so scoping to in-period quizzes already implies it.
  const attempts =
    quizIds.length === 0
      ? []
      : await prisma.quizAttempt.findMany({
          where: {
            quizId: { in: quizIds },
            ...(studentIds ? { studentId: { in: studentIds } } : {}),
          },
          select: { id: true, score: true, submitted_at: true, quizId: true },
        });

  const submitted = attempts.filter((a) => a.submitted_at != null);
  const scored = submitted.filter((a) => a.score != null);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + Number(a.score), 0) / scored.length)
      : null;

  return {
    kpis: [
      { key: 'quizCount', label: 'Quizzes', value: quizzes.length },
      { key: 'quizPublished', label: 'Published', value: quizzes.filter((q) => !q.is_draft).length },
      { key: 'quizAttempts', label: 'Attempts', value: attempts.length },
      { key: 'quizSubmitted', label: 'Submitted', value: submitted.length },
      { key: 'quizAvgScore', label: 'Average score', value: avgScore, unit: '%' },
    ],
    rows: quizzes.map((q) => {
      const inScope = attempts.filter((a) => a.quizId === q.id);
      const mine = submitted.filter((a) => a.quizId === q.id);
      const withScore = mine.filter((a) => a.score != null);
      return {
        id: q.id,
        title: q.title,
        course: q.courseOffering?.course?.code ?? '—',
        status: q.is_draft ? 'Draft' : 'Published',
        mode: q.mode === 'offline' ? 'Printed' : 'On device',
        questions: q._count.questions,
        // Count from the same filtered set the KPIs use. `_count.attempts` is
        // every attempt ever, by everyone — on a student report that made the
        // table contradict the total printed directly above it.
        attempts: inScope.length,
        avgScore:
          withScore.length > 0
            ? Math.round(withScore.reduce((s, a) => s + Number(a.score), 0) / withScore.length)
            : null,
      };
    }),
  };
}

export async function assignmentsDomain({ offeringIds, studentIds }, window = {}) {
  const { since, until } = window;
  if (offeringIds.length === 0) return { kpis: [], rows: [] };

  const assignments = await prisma.assignment.findMany({
    where: {
      courseOfferingId: { in: offeringIds },
      ...createdAtFilter(since, until),
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      maxMarks: true,
      // Assignments carry publish state on a 1:1 lifecycle row, not a column.
      lifecycle: { select: { publishStatus: true } },
      _count: { select: { submissions: true } },
      courseOffering: { select: { course: { select: { code: true } } } },
    },
    orderBy: { due_date: 'desc' },
  });

  const isDraft = (a) => (a.lifecycle?.publishStatus ?? 'DRAFT') === 'DRAFT';

  // Grades live on a separate SubmissionGrade row (1:1), so "graded" means
  // that row exists with a score — not a column on Submission itself.
  const assignmentIds = assignments.map((a) => a.id);

  const submissions =
    assignmentIds.length === 0
      ? []
      : await prisma.submission.findMany({
          where: {
            // Scoped to the assignments above so rows sum to the KPI.
            assignmentId: { in: assignmentIds },
            ...(studentIds ? { studentId: { in: studentIds } } : {}),
          },
          select: {
            id: true,
            assignmentId: true,
            gradeRow: { select: { score: true } },
          },
        });

  const isGraded = (s) => s.gradeRow?.score != null;
  const graded = submissions.filter(isGraded);
  const now = new Date();

  return {
    kpis: [
      { key: 'assignmentCount', label: 'Assignments', value: assignments.length },
      {
        key: 'assignmentOpen',
        label: 'Still open',
        value: assignments.filter((a) => !isDraft(a) && a.due_date > now).length,
      },
      { key: 'submissionCount', label: 'Submissions', value: submissions.length },
      { key: 'gradedCount', label: 'Graded', value: graded.length },
      {
        key: 'gradedPct',
        label: 'Marked',
        value: pct(graded.length, submissions.length),
        unit: '%',
      },
    ],
    rows: assignments.map((a) => {
      const mine = submissions.filter((s) => s.assignmentId === a.id);
      return {
        id: a.id,
        title: a.title,
        course: a.courseOffering?.course?.code ?? '—',
        status: isDraft(a) ? 'Draft' : a.due_date > now ? 'Open' : 'Closed',
        due: a.due_date,
        // No `|| _count.submissions` fallback: `mine.length === 0` is a real
        // answer, and falling back showed a student who submitted nothing the
        // whole cohort's submission count.
        submissions: mine.length,
        graded: mine.filter(isGraded).length,
      };
    }),
  };
}

export async function resourcesDomain({ offeringIds, studentIds }, window = {}) {
  const { since, until } = window;
  if (offeringIds.length === 0) return { kpis: [], rows: [] };

  const resources = await prisma.resource.findMany({
    where: {
      courseOfferingId: { in: offeringIds },
      ...createdAtFilter(since, until),
    },
    select: {
      id: true,
      title: true,
      type: true,
      is_draft: true,
      created_at: true,
      courseOffering: { select: { course: { select: { code: true } } } },
    },
    orderBy: { created_at: 'desc' },
  });

  const resourceIds = resources.map((r) => r.id);

  const views =
    resourceIds.length === 0
      ? []
      : await prisma.resourceView.findMany({
          where: {
            // Scoped to the resources above so rows sum to the KPI.
            resourceId: { in: resourceIds },
            ...(studentIds ? { studentId: { in: studentIds } } : {}),
          },
          select: { resourceId: true, studentId: true },
        });

  const viewsByResource = new Map();
  for (const v of views) {
    viewsByResource.set(v.resourceId, (viewsByResource.get(v.resourceId) ?? 0) + 1);
  }

  const byType = {};
  for (const r of resources) {
    const label = resourceTypeLabel(r.type);
    byType[label] = (byType[label] ?? 0) + 1;
  }

  return {
    kpis: [
      { key: 'resourceCount', label: 'Resources', value: resources.length },
      { key: 'resourceViews', label: 'Views', value: views.length },
      {
        key: 'resourceViewers',
        label: 'Unique viewers',
        value: new Set(views.map((v) => v.studentId)).size,
      },
      {
        key: 'resourceUnviewed',
        label: 'Never opened',
        value: resources.filter((r) => !viewsByResource.has(r.id)).length,
      },
    ],
    breakdown: Object.entries(byType).map(([type, count]) => ({ label: type, value: count })),
    rows: resources.map((r) => ({
      id: r.id,
      title: r.title,
      course: r.courseOffering?.course?.code ?? '—',
      type: resourceTypeLabel(r.type),
      status: r.is_draft ? 'Draft' : 'Published',
      views: viewsByResource.get(r.id) ?? 0,
    })),
  };
}

/** Course feed posts — the in-course conversation. */
export async function discussionsDomain({ offeringIds, studentIds, scope }, window = {}) {
  const { since, until } = window;
  if (offeringIds.length === 0) return { kpis: [], rows: [] };

  // On a student report these must be *their* posts. Without the author
  // filter a student's "Posts" counted every post in their courses by
  // anyone — the same leak that once made attempts show the whole cohort's.
  //
  // Keyed on the scope, not on `studentIds` being set: that is also populated
  // for course, batch and faculty (the cohort), and filtering by it there
  // dropped every teacher-authored post — a course feed reported 0 posts
  // while a post and its reply sat in the table underneath.
  const onePerson = scope === 'student';
  const byAuthor = onePerson && studentIds ? { authorId: { in: studentIds } } : {};

  const where = {
    courseOfferingId: { in: offeringIds },
    ...byAuthor,
    ...createdAtFilter(since, until),
  };
  const replyWindow = createdAtFilter(since, until);
  const [postCount, replyCount, posts] = await Promise.all([
    prisma.coursePost.count({ where }),
    prisma.coursePostReply.count({
      where: {
        post: { courseOfferingId: { in: offeringIds } },
        ...byAuthor,
        ...replyWindow,
      },
    }),
    prisma.coursePost.findMany({
      where,
      select: {
        id: true,
        created_at: true,
        authorId: true,
        courseOffering: { select: { course: { select: { code: true } } } },
        _count: { select: { replies: true, reactions: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    kpis: [
      { key: 'postCount', label: 'Posts', value: postCount },
      { key: 'replyCount', label: 'Replies', value: replyCount },
      // Distinct authors can only ever be 0 or 1 on a one-student report,
      // so it earns a place only on the scopes that cover a group.
      ...(onePerson
        ? []
        : [
            {
              key: 'posters',
              label: 'People posting',
              value: new Set(posts.map((p) => p.authorId)).size,
            },
          ]),
    ],
    rows: posts.map((p) => ({
      id: p.id,
      course: p.courseOffering?.course?.code ?? '—',
      created: p.created_at,
      replies: p._count.replies,
      reactions: p._count.reactions,
    })),
  };
}

/** Announcements reach the audience by faculty / batch / section, not by course. */
export async function announcementsDomain({ facultyIds, batchIds, sectionIds }, window = {}) {
  const { since, until } = window;
  const targets = [];
  if (facultyIds?.length) targets.push({ facultyId: { in: facultyIds } });
  if (batchIds?.length) targets.push({ batchId: { in: batchIds } });
  if (sectionIds?.length) targets.push({ sectionId: { in: sectionIds } });
  if (targets.length === 0) return { kpis: [], rows: [] };

  const where = { OR: targets, ...createdAtFilter(since, until, 'createdAt') };
  const announcements = await prisma.announcement.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { reads: true, comments: true, acknowledgements: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const total = await prisma.announcement.count({ where });

  return {
    kpis: [
      { key: 'announcementCount', label: 'Announcements', value: total },
      {
        key: 'announcementPublished',
        label: 'Published',
        value: announcements.filter((a) => a.status === 'PUBLISHED').length,
      },
      {
        key: 'announcementReads',
        label: 'Reads',
        value: announcements.reduce((s, a) => s + a._count.reads, 0),
      },
    ],
    rows: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      published: a.publishedAt ?? a.createdAt,
      reads: a._count.reads,
      comments: a._count.comments,
      acknowledgements: a._count.acknowledgements,
    })),
  };
}

/** Clubs hang off a faculty, so only faculty-shaped scopes have them. */
export async function clubsDomain({ facultyIds }) {
  if (!facultyIds?.length) return { kpis: [], rows: [] };

  const clubs = await prisma.club.findMany({
    where: { facultyId: { in: facultyIds } },
    select: {
      id: true,
      name: true,
      status: true,
      memberCountCache: true,
      lastActivityAt: true,
      createdAt: true,
    },
    orderBy: { memberCountCache: 'desc' },
  });

  return {
    kpis: [
      { key: 'clubCount', label: 'Clubs', value: clubs.length },
      { key: 'clubActive', label: 'Approved', value: clubs.filter((c) => c.status === 'APPROVED').length },
      {
        key: 'clubMembers',
        label: 'Memberships',
        value: clubs.reduce((s, c) => s + (c.memberCountCache ?? 0), 0),
      },
    ],
    rows: clubs.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      members: c.memberCountCache ?? 0,
      lastActivity: c.lastActivityAt,
    })),
  };
}
