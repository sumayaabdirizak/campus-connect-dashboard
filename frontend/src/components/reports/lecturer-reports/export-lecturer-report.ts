import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type {
  LecturerReportDetail,
  LecturerReportListRow
} from '@/lib/teacher-courses/lecturer-report-types';
import {
  buildReportInvoiceHeader,
  entityReportId
} from '@/lib/reports/services/report-print-invoice-header';
import { kpisRow, sectionHtml, tableHtml } from '@/lib/reports/services/report-print-helpers';
import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

function marks(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

const LIST_HEADERS = [
  'Lecturer',
  'Staff #',
  'Department',
  'Courses',
  'Students',
  'Quizzes',
  'Assignments',
  'Resources',
  'Failed',
  'Avg %',
  'Avg marks'
] as const;

export function exportLecturerReportsListCsv(rows: LecturerReportListRow[]) {
  downloadCsv(
    'lecturer-reports.csv',
    [...LIST_HEADERS],
    rows.map((r) => [
      r.name,
      r.number ?? '',
      r.department ?? '',
      r.courses,
      r.students,
      r.quizzes,
      r.assignments,
      r.resources,
      r.failed,
      r.avgOverallPct ?? '',
      r.avgOverallMarks ?? ''
    ])
  );
}

export function exportLecturerReportsListPdf(rows: LecturerReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Lecturer reports',
    documentSubtitle: 'Faculty lecturers — courses and outcomes',
    reportId: entityReportId('teacher', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Faculty lecturer reports'],
    toTitle: 'All lecturers',
    toLines: [`Lecturers in export: ${rows.length}`]
  });
  const body = [
    header,
    sectionHtml(
      'Lecturers',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.name,
          r.number ?? '—',
          r.department ?? '—',
          r.courses,
          r.students,
          r.quizzes,
          r.assignments,
          r.resources,
          r.failed,
          pct(r.avgOverallPct),
          marks(r.avgOverallMarks)
        ]),
        'No lecturers to export.'
      )
    )
  ].join('');
  printHtmlDocument('Lecturer reports', body);
}

export function exportLecturerReportDetailCsv(report: LecturerReportDetail) {
  const s = report.summary;
  downloadCsv(
    `lecturer-${report.lecturer.id}-report.csv`,
    ['Field', 'Value'],
    [
      ['Lecturer', report.lecturer.name],
      ['Staff #', report.lecturer.number ?? ''],
      ['Department', report.lecturer.department ?? ''],
      ['Courses', s.courses],
      ['Students', s.students],
      ['Quizzes', s.quizzes],
      ['Assignments', s.assignments],
      ['Resources', s.resources],
      ['Failed', s.failed],
      ['Avg %', s.avgOverallPct ?? ''],
      ['Avg marks', s.avgOverallMarks ?? '']
    ]
  );
}

export function exportLecturerReportDetailPdf(report: LecturerReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const s = report.summary;
  const header = buildReportInvoiceHeader({
    documentTitle: 'Lecturer report',
    documentSubtitle: escapeHtml(report.lecturer.name),
    reportId: entityReportId('teacher', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Faculty lecturer report'],
    toTitle: report.lecturer.name,
    toLines: [
      report.lecturer.number ? `Staff # ${report.lecturer.number}` : '—',
      report.lecturer.department ?? '—'
    ]
  });
  const body = [
    header,
    kpisRow([
      { label: 'Courses', value: s.courses },
      { label: 'Students', value: s.students },
      { label: 'Failed', value: s.failed },
      { label: 'Avg marks', value: marks(s.avgOverallMarks) },
      { label: 'Avg %', value: pct(s.avgOverallPct) }
    ]),
    sectionHtml(
      'Courses',
      tableHtml(
        ['Course', 'Section', 'Batch', 'Students', 'Failed', 'Avg %', 'Avg marks'],
        report.courses.map((c) => [
          `${c.courseCode} — ${c.courseName}`,
          c.section,
          c.batch ?? '—',
          c.students,
          c.failed,
          pct(c.avgOverallPct),
          marks(c.avgOverallMarks)
        ]),
        'No courses.'
      )
    )
  ].join('');
  printHtmlDocument(`Lecturer — ${report.lecturer.name}`, body);
}
