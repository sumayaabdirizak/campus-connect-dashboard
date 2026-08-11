import type { CourseActivityRow } from '../../queries/course-activity';
import type { NotifItem } from '../../types';
import { rel } from './notification-feed-mappers';

function courseSource(kind: string): 'assignment' | 'quiz' | 'course' {
  if (kind.startsWith('QUIZ')) return 'quiz';
  if (kind.startsWith('ASSIGNMENT')) return 'assignment';
  return 'course';
}

export function mapCourseActivityItems(
  rows: CourseActivityRow[] | undefined,
  isRead: (key: string, serverRead?: boolean) => boolean
): NotifItem[] {
  return (rows ?? []).map((n) => {
    const key = `course-${n.id}`;
    return {
      key,
      source: courseSource(n.kind),
      type: n.kind,
      title: n.courseCode ? `${n.courseCode} · ${n.title}` : n.title,
      subtitle: rel(n.createdAt) || 'Course update',
      body: n.body,
      at: n.createdAt,
      href: n.href || '/dashboard',
      read: isRead(key, !!n.readAt),
      serverId: n.id,
    };
  });
}
