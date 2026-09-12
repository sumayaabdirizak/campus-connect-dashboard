'use client';

/**
 * Headless tab warm-up for the course detail page.
 *
 * Mounts the same list hooks the tab components use with live refresh so
 * caches stay current while the user reads any tab (chat, feed, etc.).
 * Renders nothing — mount only after course detail succeeds.
 */
import { useAssignments } from '@/lib/course-details/queries/assignments-queries';
import { useQuizzes, useAvailableQuizzes } from '@/lib/course-details/queries/quizzes-queries';
import { useChatRoom } from '@/lib/course-details/queries/chat-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { useGroups } from '@/lib/course-details/queries/groups-queries';
import { useResources, useModules } from '@/lib/course-details/queries/resources-queries';
import { useCourseFeed } from '@/lib/course-details/queries/feed-queries';
import { useGradebook, useMyGrades } from '@/lib/course-details/queries/gradebook-queries';

/**
 * Warm the cache, do not poll it.
 *
 * Prefetch uses `live: false` so hidden tabs do not poll every 15s.
 * Visible tabs pass `live: true` (poll + window-focus) for grades/new content.
 */
const PREFETCH = { live: false } as const;

/** Tabs both roles can open. Roster is included for students too — the chat
 *  tab needs it for @mention autocomplete. */
function CommonPrefetch({ courseId }: { courseId: string }) {
  useAssignments(courseId, PREFETCH);
  useQuizzes(courseId, PREFETCH);
  useChatRoom(courseId, PREFETCH);
  useRoster(courseId, PREFETCH);
  useGroups(courseId, PREFETCH);
  useResources(courseId, undefined, PREFETCH);
  useModules(courseId, PREFETCH);
  useCourseFeed(courseId, PREFETCH);
  return null;
}

function TeacherPrefetch({ courseId }: { courseId: string }) {
  useGradebook(courseId, true, PREFETCH);
  return null;
}

function StudentPrefetch({ courseId }: { courseId: string }) {
  useAvailableQuizzes(courseId, PREFETCH);
  useMyGrades(courseId, true, PREFETCH);
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
