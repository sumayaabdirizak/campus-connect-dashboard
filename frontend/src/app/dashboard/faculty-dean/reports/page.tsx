import { redirect } from 'next/navigation';

/** Legacy dean academic-reports URL → lecturer-style course reports. */
export default function FacultyDeanReportsRedirectPage() {
  redirect('/dashboard/reports/course-reports');
}
