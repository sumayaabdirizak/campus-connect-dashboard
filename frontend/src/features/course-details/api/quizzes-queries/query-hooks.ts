import { useQuery } from '@/lib/async-query';
import {
  getAvailableQuizzes,
  getQuizAnalytics,
  getQuizAttempts,
  getQuizzesForOffering
} from '../quizzes-service';
import { quizKeys } from './keys';

export function useQuizzes(courseOfferingId: string) {
  return useQuery({
    queryKey: quizKeys.list(courseOfferingId),
    queryFn: () => getQuizzesForOffering(courseOfferingId)
  });
}

export function useAvailableQuizzes(courseOfferingId: string) {
  return useQuery({
    queryKey: quizKeys.available(courseOfferingId),
    queryFn: () => getAvailableQuizzes(courseOfferingId)
  });
}

export function useQuizAttempts(quizId: number | null) {
  return useQuery({
    queryKey: quizId ? quizKeys.attempts(quizId) : ['quizzes', 'attempts', 'none'],
    queryFn: () => (quizId ? getQuizAttempts(quizId) : Promise.resolve([])),
    enabled: !!quizId
  });
}

export function useQuizAnalytics(quizId: number | null) {
  return useQuery({
    queryKey: quizId ? quizKeys.analytics(quizId) : ['quizzes', 'analytics', 'none'],
    queryFn: () =>
      quizId
        ? getQuizAnalytics(quizId)
        : Promise.resolve({ totalSubmissions: 0, avgScore: null, questions: [] }),
    enabled: !!quizId
  });
}
