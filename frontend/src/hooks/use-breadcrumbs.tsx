'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/features/teacher-courses/api/queries';
import { useStudentCourseDetail } from '@/features/student-courses/api/queries';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const COURSE_OFFERING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COURSE_DETAIL_RE = /^\/dashboard\/courses\/([^/]+)$/;

function formatCourseBreadcrumbTitle(course?: { code?: string; name?: string } | null) {
  if (!course) return 'Course';
  if (course.code && course.name) return `${course.code} — ${course.name}`;
  return course.name ?? course.code ?? 'Course';
}

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }]
};

export function useBreadcrumbs() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const courseMatch = pathname.match(COURSE_DETAIL_RE);
  const offeringId = courseMatch?.[1] ?? '';
  const isCourseDetailPage =
    Boolean(offeringId) && COURSE_OFFERING_ID_RE.test(offeringId);
  const isStudent = user?.role === 'STUDENT';

  const teacherQuery = useCourseDetail(offeringId, !isStudent && isCourseDetailPage);
  const studentQuery = useStudentCourseDetail(offeringId, isStudent && isCourseDetailPage);
  const courseData = isStudent ? studentQuery.data : teacherQuery.data;

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const isCourseSegment =
        isCourseDetailPage && index === segments.length - 1 && segment === offeringId;

      return {
        title: isCourseSegment
          ? formatCourseBreadcrumbTitle(courseData?.course)
          : segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname, isCourseDetailPage, offeringId, courseData?.course]);

  return breadcrumbs;
}
