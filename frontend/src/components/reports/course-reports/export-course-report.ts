import { AUTH_BRAND } from '@/config/auth-brand';
import type { CourseReportDetail } from '@/lib/teacher-courses/course-report-types';
import {
  buildReportInvoiceHeader,
  entityReportId
} from '@/lib/reports/services/report-print-invoice-header';
import {
  kpisRow,
  sectionHtml,
  tableHtml
} from '@/lib/reports/services/report-print-helpers';
import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

export function exportCourseReportPdf(report: CourseReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const c = report.course;
  const title = `${c.courseCode} — ${c.courseName}`;

  const header = buildReportInvoiceHeader({
    documentTitle: 'Course report',
    documentSubtitle: 'Content posted and student outcomes',
    reportId: entityReportId('course', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Teacher course report'],
    toTitle: title,
    toLines: [
      `Section: ${c.section}`,
      c.batch ? `Batch: ${c.batch}` : null,
      c.department ? `Department: ${c.department}` : null
    ].filter(Boolean) as string[]
  });

  const body = [
    header,
    kpisRow([
      { label: 'Quizzes', value: report.content.quizzes },
      { label: 'Assignments', value: report.content.assignments },
      { label: 'Resources', value: report.content.resources },
      { label: 'Students', value: report.classSummary.studentCount }
    ]),
    kpisRow([
      { label: 'Avg score', value: pct(report.classSummary.avgOverallPct) },
      { label: 'Passed', value: report.classSummary.passedCount },
      { label: 'Failed', value: report.classSummary.failedCount },
      { label: 'No grades', value: report.classSummary.ungradedCount }
    ]),
    sectionHtml(
      'Quizzes posted',
      tableHtml(
        ['Title'],
        report.content.quizItems.map((i) => [i.title]),
        'No quizzes published.'
      )
    ),
    sectionHtml(
      'Assignments posted',
      tableHtml(
        ['Title'],
        report.content.assignmentItems.map((i) => [i.title]),
        'No assignments published.'
      )
    ),
    sectionHtml(
      'Resources posted',
      tableHtml(
        ['Title', 'Type'],
        report.content.resourceItems.map((i) => [i.title, i.type ?? '']),
        'No resources published.'
      )
    ),
    sectionHtml(
      'Failed students (below 60%)',
      tableHtml(
        ['Student', 'ID', 'Overall %'],
        report.failedStudents.map((s) => [s.name, s.number ?? '—', pct(s.overallPct)]),
        'No failed students.'
      )
    ),
    sectionHtml(
      'All students',
      tableHtml(
        ['Student', 'ID', 'Overall %', 'Status'],
        report.students.map((s) => [
          s.name,
          s.number ?? '—',
          pct(s.overallPct),
          s.status
        ])
      )
    ),
    `<div class="footer"><span><strong>${escapeHtml(AUTH_BRAND.productName)}</strong> · Course report</span><span>Generated ${escapeHtml(generatedAt)}</span></div>`
  ].join('');

  printHtmlDocument(`Course report — ${title}`, body);
}
