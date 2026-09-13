import { redirect } from 'next/navigation';

/** Legacy platform-analytics URL → same academic reports as Dean. */
export default function AdminReportPage() {
  redirect('/dashboard/reports/course-reports');
}
