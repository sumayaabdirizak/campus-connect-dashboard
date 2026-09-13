import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type {
  BatchReportDetail,
  BatchReportListRow
} from '@/lib/teacher-courses/batch-report-types';
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
  'Batch',
  'Programme',
  'Department',
  'Status',
  'Sections',
  'Students',
  'Courses',
  'Quizzes',
  'Assignments',
  'Failed',
  'Avg %',
  'Avg marks'
] as const;

export function exportBatchReportsListCsv(rows: BatchReportListRow[]) {
  downloadCsv(
    'batch-reports.csv',
    [...LIST_HEADERS],
    rows.map((r) => [
      r.name,
      r.programme ?? '',
      r.department ?? '',
      r.status ?? '',
      r.sections,
      r.students,
      r.courses,
      r.quizzes,
      r.assignments,
      r.failed,
      r.avgOverallPct ?? '',
      r.avgOverallMarks ?? ''
    ])
  );
}

export function exportBatchReportsListPdf(rows: BatchReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Batch reports',
    documentSubtitle: 'Faculty batches — courses and outcomes',
    reportId: entityReportId('batch', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Faculty batch reports'],
    toTitle: 'All batches',
    toLines: [`Batches in export: ${rows.length}`]
  });
  const body = [
    header,
    sectionHtml(
      'Batches',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.name,
          r.programme ?? '—',
          r.department ?? '—',
          r.status ?? '—',
          r.sections,
          r.students,
          r.courses,
          r.quizzes,
          r.assignments,
          r.failed,
          pct(r.avgOverallPct),
          marks(r.avgOverallMarks)
        ]),
        'No batches to export.'
      )
    )
  ].join('');
  printHtmlDocument('Batch reports', body);
}

export function exportBatchReportDetailCsv(report: BatchReportDetail) {
  const s = report.summary;
  downloadCsv(
    `batch-${report.batch.id}-report.csv`,
    ['Field', 'Value'],
    [
      ['Batch', report.batch.name],
      ['Programme', report.batch.programme ?? ''],
      ['Department', report.batch.department ?? ''],
      ['Status', report.batch.status ?? ''],
      ['Sections', s.sections],
      ['Students', s.students],
      ['Courses', s.courses],
      ['Failed', s.failed],
      ['Avg %', s.avgOverallPct ?? ''],
      ['Avg marks', s.avgOverallMarks ?? '']
    ]
  );
}

export function exportBatchReportDetailPdf(report: BatchReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const s = report.summary;
  const header = buildReportInvoiceHeader({
    documentTitle: 'Batch report',
    documentSubtitle: escapeHtml(report.batch.name),
    reportId: entityReportId('batch', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Faculty batch report'],
    toTitle: report.batch.name,
    toLines: [
      report.batch.programme ?? '—',
      report.batch.department ?? '—'
    ]
  });
  const body = [
    header,
    kpisRow([
      { label: 'Sections', value: s.sections },
      { label: 'Students', value: s.students },
      { label: 'Courses', value: s.courses },
      { label: 'Failed', value: s.failed },
      { label: 'Avg marks', value: marks(s.avgOverallMarks) },
      { label: 'Avg %', value: pct(s.avgOverallPct) }
    ]),
    sectionHtml(
      'Sections',
      tableHtml(
        ['Section', 'Students'],
        report.sections.map((sec) => [sec.name, sec.students]),
        'No sections.'
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
  printHtmlDocument(`Batch — ${report.batch.name}`, body);
}
