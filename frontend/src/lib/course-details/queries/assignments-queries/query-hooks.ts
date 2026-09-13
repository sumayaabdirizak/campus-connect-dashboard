import { useQuery } from '@/lib/async-query';
import {
  getAssignments,
  getMyAssignmentSummary,
  getMySubmission,
  getSubmissions,
  listExtensions
} from '@/lib/course-details/services/assignments-service';
import { assignmentKeys } from './keys';
import {
  type LiveQueryOptions,
  withCourseLiveRefresh
} from '../live-query-options';

export function useAssignments(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: assignmentKeys.list(courseOfferingId),
    queryFn: () => getAssignments(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export function useSubmissions(assignmentId: number | null, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.submissions(assignmentId)
      : ['assignments', 'submissions', 'none'],
    queryFn: () => (assignmentId ? getSubmissions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId,
    ...withCourseLiveRefresh(live)
  });
}

export function useExtensions(assignmentId: number | null, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.extensions(assignmentId)
      : ['assignments', 'extensions', 'none'],
    queryFn: () => (assignmentId ? listExtensions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId,
    ...withCourseLiveRefresh(live)
  });
}

export function useMyAssignmentSummary(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: assignmentKeys.mySummary(courseOfferingId),
    queryFn: () => getMyAssignmentSummary(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export function useMySubmission(assignmentId: number | null, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.mySubmission(assignmentId)
      : ['assignments', 'my-submission', 'none'],
    queryFn: () => (assignmentId ? getMySubmission(assignmentId) : Promise.resolve(null)),
    enabled: !!assignmentId,
    ...withCourseLiveRefresh(live)
  });
}
