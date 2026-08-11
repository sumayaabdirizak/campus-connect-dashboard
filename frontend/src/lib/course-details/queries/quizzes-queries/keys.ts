export const quizKeys = {
  all: ['quizzes'] as const,
  list: (courseOfferingId: string) => [...quizKeys.all, 'list', courseOfferingId] as const,
  available: (courseOfferingId: string) =>
    [...quizKeys.all, 'available', courseOfferingId] as const,
  attempts: (quizId: number) => [...quizKeys.all, 'attempts', quizId] as const,
  analytics: (quizId: number) => [...quizKeys.all, 'analytics', quizId] as const
};
