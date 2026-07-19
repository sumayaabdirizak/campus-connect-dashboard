export function computeQuizStats(allQuizAttempts) {
  const passedQuizzes = allQuizAttempts.filter(
    (a) => a.score !== null && a.score >= (a.quiz?.passing_score ?? 50)
  ).length;
  const quizPassRate =
    allQuizAttempts.length > 0 ? Math.round((passedQuizzes / allQuizAttempts.length) * 100) : 0;
  const avgScore =
    allQuizAttempts.length > 0
      ? Math.round(allQuizAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / allQuizAttempts.length)
      : 0;

  const quizScoreDistribution = [
    { range: '90-100', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 90).length },
    { range: '80-89', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 80 && (a.score ?? 0) < 90).length },
    { range: '70-79', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 70 && (a.score ?? 0) < 80).length },
    { range: '60-69', count: allQuizAttempts.filter((a) => (a.score ?? 0) >= 60 && (a.score ?? 0) < 70).length },
    { range: '<60', count: allQuizAttempts.filter((a) => (a.score ?? 0) < 60).length },
  ];

  return { passedQuizzes, quizPassRate, avgScore, quizScoreDistribution };
}

export function buildGradeDistribution(gradedSubmissions) {
  return [
    { grade: 'A', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 90).length },
    { grade: 'B', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 80 && (s.grade ?? 0) < 90).length },
    { grade: 'C', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 70 && (s.grade ?? 0) < 80).length },
    { grade: 'D', count: gradedSubmissions.filter((s) => (s.grade ?? 0) >= 60 && (s.grade ?? 0) < 70).length },
    { grade: 'F', count: gradedSubmissions.filter((s) => (s.grade ?? 0) < 60).length },
  ];
}
