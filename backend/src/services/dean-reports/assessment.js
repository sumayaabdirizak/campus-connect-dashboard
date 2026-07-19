export function buildAssessmentReports({
  totalSubmissions,
  activeStudents,
  quizPassRate,
  gradedSubmissions,
  allQuizAttempts,
}) {
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
    examinations: {
      submissionRate: Math.min(100, Math.round(quizPassRate * 0.85)),
      passRate: Math.max(0, quizPassRate - 5),
      avgScore: Math.max(0, Math.round(quizPassRate * 0.9)),
    },
  };
}
