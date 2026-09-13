import { redirect } from 'next/navigation';

/** Legacy LMS activity reports → academic course reports (same as Dean). */
export default function ReportsPage() {
  redirect('/dashboard/reports/course-reports');
}
