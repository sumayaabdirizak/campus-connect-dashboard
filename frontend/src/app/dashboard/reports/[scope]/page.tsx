import { redirect } from 'next/navigation';

const SCOPE_TO_REPORT: Record<string, string> = {
  course: '/dashboard/reports/course-reports',
  student: '/dashboard/reports/student-reports',
  teacher: '/dashboard/reports/lecturer-reports',
  batch: '/dashboard/reports/batch-reports',
  section: '/dashboard/reports/course-reports',
  faculty: '/dashboard/reports/faculty-dashboard'
};

/** Legacy LMS scope URLs → Dean-style academic reports. */
export default async function ReportScopeRedirectPage({
  params
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  redirect(SCOPE_TO_REPORT[scope] ?? '/dashboard/reports/course-reports');
}
