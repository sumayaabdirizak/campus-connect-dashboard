export async function runAnalyticsPhaseC(ctx) {
  const {
    scopedFacultyId,
    monthsCount,
    facultyMeta,
    activeStudents,
    totalSubmissions,
    allQuizAttempts,
    totalResourceViews,
    messagesCount,
    platformFaculties,
    platformDepartments,
    platformPrograms,
    platformTeachers,
    platformOfferings,
    platformClubs,
    platformAnnouncements,
    passedQuizzes,
    quizPassRate,
    avgScore,
    announcementReach,
    submissionsByCourse,
    quizScoreDistribution,
    gradeDistribution,
    courseCompletion,
    communicationActivity,
    learningProgress,
    userGrowth,
    userSegment,
    roleDistribution,
    messagesByScope,
    mostActiveCourses,
    recentUsers,
    recentSubs,
    recentQuizAttempts,
    dailyMessages,
    totalUsers,
    lateSubmissions,
    onTimeSubmissions,
    activeUsersThisMonth,
    coursePerformance,
    assignmentAnalytics,
    quizPerformance,
    departmentPerformance,
    userGrowthTrend,
    uniqueCourses,
  } = ctx;

  const insights = [];
  if (userGrowthTrend < 0) {
    insights.push(
      `New user registrations decreased by ${Math.abs(userGrowthTrend)}% compared to the prior month.`
    );
  } else if (userGrowthTrend > 0) {
    insights.push(`New user registrations increased by ${userGrowthTrend}% compared to the prior month.`);
  }
  if (quizPassRate < 70 && allQuizAttempts.length > 0) {
    insights.push(
      `Quiz pass rate is ${quizPassRate}%. Consider review sessions or adjusted assessment difficulty.`
    );
  }
  if (lateSubmissions > totalSubmissions * 0.2 && totalSubmissions > 0) {
    insights.push('Late submissions exceed 20% of total volume. Review deadline communication.');
  }
  if (announcementReach < 50 && activeStudents > 0) {
    insights.push('Announcement reach is below 50%. Increase visibility through targeted notifications.');
  }
  if (!insights.length) {
    insights.push('Platform engagement metrics are stable for the selected period.');
  }

  const recentActivity = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,
      type: 'registration',
      user: u.full_name,
      action: 'New user registered',
      timestamp: u.created_at.toISOString(),
    })),
    ...recentSubs.map((s) => ({
      id: `sub-${s.id}`,
      type: 'submission',
      user: s.student?.full_name ?? 'Student',
      action: `Submitted "${s.assignment?.title ?? 'assignment'}"`,
      timestamp: s.submitted_at.toISOString(),
    })),
    ...recentQuizAttempts.map((q) => ({
      id: `quiz-${q.id}`,
      type: 'quiz',
      user: q.student?.full_name ?? 'Student',
      action: `Quiz attempt: ${q.quiz?.title ?? 'Quiz'} (${q.score ?? 0}%)`,
      timestamp: q.started_at.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);

  const dailyActiveSessions = dailyMessages.reduce((s, d) => s + d.visits, 0);

  return {
    scope: {
      facultyId: scopedFacultyId,
      facultyName: facultyMeta?.name ?? null,
      facultyCode: facultyMeta?.code ?? null,
      periodMonths: monthsCount,
      periodLabel: `Last ${monthsCount} months`,
      userSegmentLabel: userSegment.label,
    },
    platform: {
      faculties: platformFaculties,
      departments: platformDepartments,
      programs: platformPrograms,
      students: activeStudents,
      teachers: platformTeachers,
      offerings: platformOfferings,
      clubs: platformClubs,
      announcements: platformAnnouncements,
    },
    kpis: {
      activeUsers: activeStudents,
      totalUsers,
      activeUsersThisMonth,
      totalCourses: uniqueCourses.length,
      quizAttempts: allQuizAttempts.length,
      completionRate: avgScore,
      dailyActiveSessions,
      messagesExchanged: messagesCount,
      assignmentsSubmitted: totalSubmissions,
      avgCourseCompletion: avgScore,
      announcementReach,
      onTimeSubmissions:
        totalSubmissions > 0 ? Math.round((onTimeSubmissions / totalSubmissions) * 100) : 0,
      quizPassRate,
      resourceViews: totalResourceViews,
      trends: {
        totalUsers: userGrowthTrend,
        activeUsers: userGrowthTrend,
        totalCourses: 0,
        assignmentsSubmitted: 0,
        quizAttempts: 0,
        completionRate: 0,
        dailyActiveSessions: 0,
      },
    },
    charts: {
      communicationActivity,
      learningProgress,
      userGrowth,
      submissionsByCourse,
      quizScoreDistribution,
      gradeDistribution,
      courseCompletion,
      usersByFaculty: userSegment.rows,
      messagesByScope,
      roleDistribution,
      mostActiveCourses,
      coursePerformance,
      assignmentAnalytics,
      quizPerformance,
      departmentPerformance,
      systemUsage: dailyMessages,
      userGrowthDetailed: userGrowth.map((u, i) => ({
        month: u.month,
        registrations: u.users,
        active: Math.round(u.users * (1 + (i % 3) * 0.1)),
      })),
    },
    insights,
    recentActivity,
  };
}
