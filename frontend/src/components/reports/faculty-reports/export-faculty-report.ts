import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type {
  FacultyReportDetail,
  FacultyReportListRow
} from '@/lib/teacher-courses/faculty-report-types';
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
  'Faculty',
  'Code',
  'Departments',
  'Courses',
  'Students',
  'Quizzes',
  'Assignments',
  'Failed',
  'Avg %',
  'Avg marks'
] as const;

export function exportFacultyReportsListCsv(rows: FacultyReportListRow[]) {
  downloadCsv(
    'faculty-reports.csv',
    [...LIST_HEADERS],
    rows.map((r) => [
      r.name,
      r.code ?? '',
      r.departments,
      r.courses,
      r.students,
      r.quizzes,
      r.assignments,
      r.failed,
      r.avgOverallPct ?? '',
      r.avgOverallMarks ?? ''
    ])
  );
}

export function exportFacultyReportsListPdf(rows: FacultyReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Faculty reports',
    documentSubtitle: 'All faculties — departments, courses, and outcomes',
    reportId: entityReportId('faculty', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Platform faculty reports'],
    toTitle: 'All faculties',
    toLines: [`Faculties in export: ${rows.length}`]
  });
  const body = [
    header,
    sectionHtml(
      'Faculties',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.name,
          r.code ?? '—',
          r.departments,
          r.courses,
          r.students,
          r.quizzes,
          r.assignments,
          r.failed,
          pct(r.avgOverallPct),
          marks(r.avgOverallMarks)
        ]),
        'No faculties to export.'
      )
    )
  ].join('');
  printHtmlDocument('Faculty reports', body);
}

export function exportFacultyReportDetailCsv(report: FacultyReportDetail) {
  const s = report.summary;
  downloadCsv(
    `faculty-${report.faculty.id}-report.csv`,
    ['Field', 'Value'],
    [
      ['Faculty', report.faculty.name],
      ['Code', report.faculty.code ?? ''],
      ['Departments', s.departments],
      ['Students', s.students],
      ['Courses', s.courses],
      ['Failed', s.failed],
      ['Avg %', s.avgOverallPct ?? ''],
      ['Avg marks', s.avgOverallMarks ?? '']
    ]
  );
}

export function exportFacultyReportDetailPdf(report: FacultyReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const s = report.summary;
  const header = buildReportInvoiceHeader({
    documentTitle: 'Faculty report',
    documentSubtitle: escapeHtml(report.faculty.name),
    reportId: entityReportId('faculty', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Faculty report'],
    toTitle: report.faculty.name,
    toLines: [report.faculty.code ?? '—']
  });
  const body = [
    header,
    kpisRow([
      { label: 'Departments', value: s.departments },
      { label: 'Students', value: s.students },
      { label: 'Courses', value: s.courses },
      { label: 'Failed', value: s.failed },
      { label: 'Avg marks', value: marks(s.avgOverallMarks) },
      { label: 'Avg %', value: pct(s.avgOverallPct) }
    ]),
    sectionHtml(
      'Departments',
      tableHtml(
        ['Department', 'Courses', 'Students'],
        report.departments.map((d) => [d.name, d.courses, d.students]),
        'No departments.'
      )
    ),
    sectionHtml(
      'Courses',
      tableHtml(
        ['Course', 'Section', 'Students', 'Failed', 'Avg %', 'Avg marks'],
        report.courses.map((c) => [
          `${c.courseCode} — ${c.courseName}`,
          c.section,
          c.students,
          c.failed,
          pct(c.avgOverallPct),
          marks(c.avgOverallMarks)
        ]),
        'No courses.'
      )
    )
  ].join('');
  printHtmlDocument(`Faculty — ${report.faculty.name}`, body);
}
