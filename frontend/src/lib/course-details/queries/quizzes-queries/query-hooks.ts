import { useQuery } from '@/lib/async-query';
import {
  getAvailableQuizzes,
  getQuizAnalytics,
  getQuizAttempts,
  getQuizzesForOffering
} from '@/lib/course-details/services/quizzes-service';
import { quizKeys } from './keys';
import {
  type LiveQueryOptions,
  withCourseLiveRefresh
} from '../live-query-options';

export function useQuizzes(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: quizKeys.list(courseOfferingId),
    queryFn: () => getQuizzesForOffering(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export function useAvailableQuizzes(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: quizKeys.available(courseOfferingId),
    queryFn: () => getAvailableQuizzes(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export function useQuizAttempts(quizId: number | null, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: quizId ? quizKeys.attempts(quizId) : ['quizzes', 'attempts', 'none'],
    queryFn: () => (quizId ? getQuizAttempts(quizId) : Promise.resolve([])),
    enabled: !!quizId,
    ...withCourseLiveRefresh(live)
  });
}

export function useQuizAnalytics(quizId: number | null, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: quizId ? quizKeys.analytics(quizId) : ['quizzes', 'analytics', 'none'],
    queryFn: () =>
      quizId
        ? getQuizAnalytics(quizId)
        : Promise.resolve({ totalSubmissions: 0, avgScore: null, questions: [] }),
    enabled: !!quizId,
    ...withCourseLiveRefresh(live)
  });
}
