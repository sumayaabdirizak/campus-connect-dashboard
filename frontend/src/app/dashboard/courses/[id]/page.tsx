import { CourseDetailPageClient } from './course-detail-page-client';

/**
 * Server page shell so App Router always registers `/dashboard/courses/[id]`.
 * Soft-nav RSC failures previously surfaced the global not-found page for this
 * client-only route under Turbopack.
 */
export default async function CourseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseDetailPageClient offeringId={id} />;
}
