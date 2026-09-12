import { gradeToGpa } from './helpers.js';

export function buildStudentReports({
  studentProfiles,
  departments,
  gradedSubmissions,
  recentSubmissions,
  onTimeRate,
  filters = {},
}) {
  const studentGradesByUser = new Map();
  for (const g of gradedSubmissions) {
    if (!studentGradesByUser.has(g.studentId)) studentGradesByUser.set(g.studentId, []);
    studentGradesByUser.get(g.studentId).push(Number(g.grade ?? 0));
  }

  const levelFilter = filters.studentLevel
    ? String(filters.studentLevel).toUpperCase().replace(/\s+/g, '_')
    : null;
  const statusFilter = filters.status ? String(filters.status) : null;

  const rows = studentProfiles.map((sp) => {
    const grades = studentGradesByUser.get(sp.user.id) ?? [];
    const gpa =
      grades.length > 0
        ? Math.round((grades.reduce((s, g) => s + gradeToGpa(g), 0) / grades.length) * 100) / 100
        : 0;
    const dept = departments.find((d) => d.id === sp.departmentId);
    const rawLevel =
      sp.user.studentRegistrations?.[0]?.batchSection?.batch?.program?.level ?? 'UNDERGRADUATE';
    const levelKey = String(rawLevel).toUpperCase().replace(/\s+/g, '_');
    const lateCount = recentSubmissions.filter((s) => s.lateState === 'LATE').length;
    const studentOnTimeRate = Math.max(0, Math.min(100, onTimeRate - (lateCount > 5 ? 15 : 0)));
    let status = 'Good Standing';
    if (gpa < 2.0 || studentOnTimeRate < 60) status = 'At Risk';
    else if (gpa < 2.5) status = 'Probation';
    else if (gpa >= 3.5) status = "Dean's List";
    return {
      id: sp.user.id,
      student: sp.user.full_name,
      department: dept?.name ?? '—',
      level: String(rawLevel).replace(/_/g, ' '),
      levelKey,
      gpa,
      onTimeRate: studentOnTimeRate,
      status,
    };
  });

  return rows
    .filter((r) => {
      if (levelFilter && r.levelKey !== levelFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    })
    .slice(0, 100)
    .map(({ levelKey: _levelKey, ...row }) => row);
}

export function buildInstructorReports({
  teachers,
  offerings,
  allQuizAttempts,
  quizzesByOffering = new Map(),
  assignmentsByOffering = new Map(),
}) {
  const rows = teachers.map((t) => {
    const teacherOfferings = offerings.filter((o) => o.teacherId === t.id);
    const tIds = teacherOfferings.map((o) => o.id);
    const attempts = allQuizAttempts.filter((a) => tIds.includes(a.quiz?.courseOfferingId));
    const completion =
      attempts.length > 0
        ? Math.min(
            100,
            Math.round(
              (attempts.filter((a) => a.score != null).length / attempts.length) * 100
            )
          )
        : 0;
    let quizCount = 0;
    let assignmentCount = 0;
    for (const id of tIds) {
      quizCount += quizzesByOffering.get(id) ?? 0;
      assignmentCount += assignmentsByOffering.get(id) ?? 0;
    }
    const activityRaw = quizCount + assignmentCount;
    // 10 published assessments ≈ full activity bar; more still caps at 100.
    const activity = Math.min(100, activityRaw * 10);
    const rating = Math.min(5, Math.round((3.5 + completion / 100) * 10) / 10);
    return {
      id: t.id,
      instructor: t.full_name,
      department: t.lecturerProfile?.department?.name ?? '—',
      courses: teacherOfferings.length,
      quizzes: quizCount,
      assignments: assignmentCount,
      rating,
      completion,
      activity,
    };
  });

  return rows.sort((a, b) => b.activity - a.activity || b.completion - a.completion);
}
