'use client';

/**
 * Headless tab warm-up for the course detail page.
 *
 * Mounts the exact same list hooks the tab components use, so their caches
 * fill in the background while the user is still reading the Overview. The
 * first click on any tab then renders instantly from cache, and the
 * stale-while-revalidate layer in `@/lib/async-query` keeps it silently
 * fresh afterwards. In-flight coalescing means no duplicate requests when
 * the real tab mounts mid-prefetch.
 *
 * Renders nothing. Mount it only after the course detail query succeeds —
 * prefetching a course the user can't access would just spray 403s.
 */
import { useAssignments, useMyAssignmentSummary } from '@/lib/course-details/queries/assignments-queries';
import { useQuizzes, useAvailableQuizzes } from '@/lib/course-details/queries/quizzes-queries';
import { useChatRoom } from '@/lib/course-details/queries/chat-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { useGroups } from '@/lib/course-details/queries/groups-queries';
import { useResources, useModules } from '@/lib/course-details/queries/resources-queries';
import { useCourseFeed } from '@/lib/course-details/queries/feed-queries';
import { useGradebook, useMyGrades } from '@/lib/course-details/queries/gradebook-queries';

/** Tabs both roles can open. Roster is included for students too — the chat
 *  tab needs it for @mention autocomplete. */
function CommonPrefetch({ courseId }: { courseId: string }) {
  useAssignments(courseId);
  useQuizzes(courseId);
  useChatRoom(courseId);
  useRoster(courseId);
  useGroups(courseId);
  useResources(courseId);
  useModules(courseId);
  useCourseFeed(courseId);
  return null;
}

function TeacherPrefetch({ courseId }: { courseId: string }) {
  useGradebook(courseId);
  return null;
}

function StudentPrefetch({ courseId }: { courseId: string }) {
  useAvailableQuizzes(courseId);
  useMyAssignmentSummary(courseId);
  useMyGrades(courseId);
  return null;
}

export function CourseTabsPrefetch({
  courseId,
  isStudent
}: {
  courseId: string;
  isStudent: boolean;
}) {
  return (
    <>
      <CommonPrefetch courseId={courseId} />
      {isStudent ? (
        <StudentPrefetch courseId={courseId} />
      ) : (
        <TeacherPrefetch courseId={courseId} />
      )}
    </>
  );
}
