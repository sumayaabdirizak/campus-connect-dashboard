export function buildAssessmentReports({
  totalSubmissions,
  activeStudents,
  quizPassRate,
  gradedSubmissions,
  allQuizAttempts,
  resourceCount = 0,
  resourceViews = [],
}) {
  const viewers = new Set(resourceViews.map((v) => v.studentId)).size;
  const completedViews = resourceViews.filter((v) => v.completed).length;
  const watchPcts = resourceViews
    .filter((v) => v.durationSeconds > 0)
    .map((v) => Math.min(100, Math.round((v.watchedSeconds / v.durationSeconds) * 100)));

  return {
    assignments: {
      submissionRate:
        totalSubmissions > 0 && activeStudents > 0
          ? Math.min(100, Math.round((totalSubmissions / (activeStudents * 3)) * 100))
          : 0,
      passRate: quizPassRate,
      avgScore:
        gradedSubmissions.length > 0
          ? Math.round(
              gradedSubmissions.reduce((s, g) => s + Number(g.grade ?? 0), 0) /
                gradedSubmissions.length
            )
          : 0,
    },
    quizzes: {
      submissionRate:
        allQuizAttempts.length > 0 && activeStudents > 0
          ? Math.min(100, Math.round((allQuizAttempts.length / activeStudents) * 100))
          : 0,
      passRate: quizPassRate,
      avgScore:
        allQuizAttempts.length > 0
          ? Math.round(
              allQuizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / allQuizAttempts.length
            )
          : 0,
    },
    resources: {
      /** % of active students who viewed at least one resource */
      submissionRate:
        activeStudents > 0 ? Math.min(100, Math.round((viewers / activeStudents) * 100)) : 0,
      /** % of resource views marked completed */
      passRate:
        resourceViews.length > 0
          ? Math.min(100, Math.round((completedViews / resourceViews.length) * 100))
          : 0,
      /** Avg watch progress %; 0 when no resource has recorded watch-duration data */
      avgScore:
        watchPcts.length > 0
          ? Math.round(watchPcts.reduce((s, n) => s + n, 0) / watchPcts.length)
          : 0,
      resourceCount,
      viewCount: resourceViews.length,
    },
  };
}
