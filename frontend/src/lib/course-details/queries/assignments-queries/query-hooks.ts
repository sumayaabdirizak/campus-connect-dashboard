import { useQuery } from '@/lib/async-query';
import {
  getAssignments,
  getMyAssignmentSummary,
  getMySubmission,
  getSubmissions,
  listExtensions
} from '@/lib/course-details/services/assignments-service';
import { assignmentKeys } from './keys';

export function useAssignments(courseOfferingId: string) {
  return useQuery({
    queryKey: assignmentKeys.list(courseOfferingId),
    queryFn: () => getAssignments(courseOfferingId)
  });
}

export function useSubmissions(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.submissions(assignmentId)
      : ['assignments', 'submissions', 'none'],
    queryFn: () => (assignmentId ? getSubmissions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId
  });
}

export function useExtensions(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.extensions(assignmentId)
      : ['assignments', 'extensions', 'none'],
    queryFn: () => (assignmentId ? listExtensions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId
  });
}

export function useMyAssignmentSummary(courseOfferingId: string) {
  return useQuery({
    queryKey: assignmentKeys.mySummary(courseOfferingId),
    queryFn: () => getMyAssignmentSummary(courseOfferingId)
  });
}

export function useMySubmission(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.mySubmission(assignmentId)
      : ['assignments', 'my-submission', 'none'],
    queryFn: () => (assignmentId ? getMySubmission(assignmentId) : Promise.resolve(null)),
    enabled: !!assignmentId
  });
}
