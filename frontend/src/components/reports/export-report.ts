import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
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
import type { Report, ReportScope } from '@/lib/reports/types';
import { REPORT_PERIODS, REPORT_SCOPE_META } from '@/lib/reports/types';
import {
  formatReportCell,
  labelForColumn,
  reportTableColumns
} from './report-table-labels';

function periodLabel(periodId: string): string {
  return REPORT_PERIODS.find((p) => p.id === periodId)?.label ?? periodId;
}

function reportPeriodLabel(report: Report): string {
  return report.period.months === 0 ? 'All time' : `Last ${report.period.months} months`;
}

function reportFooter(generatedAt: string): string {
  return `<div class="footer"><span><strong>${escapeHtml(AUTH_BRAND.productName)}</strong> · Official activity report</span><span>Generated ${escapeHtml(generatedAt)}</span></div>`;
}

/**
 * One CSV per report: the headline numbers first, then each domain's table
 * beneath its own heading. A single file keeps the whole picture together —
 * splitting it per domain is what spreadsheets are for.
 */
export function exportReportCsv(report: Report) {
  const rows: (string | number)[][] = [];

  if (report.subject.subtitle) rows.push([report.subject.subtitle]);
  for (const m of report.subject.meta) rows.push([m.label, m.value]);
  rows.push(['Period', reportPeriodLabel(report)]);
  rows.push([]);

  rows.push(['Summary']);
  rows.push(['Domain', 'Measure', 'Value']);
  for (const k of report.kpis) {
    rows.push([k.domain, k.label, k.value === null ? '' : `${k.value}${k.unit ?? ''}`]);
  }

  for (const section of report.sections) {
    if (section.rows.length === 0) continue;
    rows.push([]);
    rows.push([section.label]);
    const cols = reportTableColumns(section.rows);
    rows.push(cols.map(labelForColumn));
    for (const r of section.rows) {
      rows.push(cols.map((c) => formatReportCell(c, r[c])));
    }
  }

  const slug = report.subject.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  downloadCsv(`${report.scope}-report-${slug}.csv`, [report.subject.name], rows);
}

/** Invoice-style PDF via browser print (Save as PDF). */
export function exportReportPdf(report: Report) {
  const generatedAt = new Date().toLocaleString();
  const meta = REPORT_SCOPE_META[report.scope];

  const header = buildReportInvoiceHeader({
    documentTitle: meta.title,
    documentSubtitle: report.subject.subtitle ?? undefined,
    reportId: entityReportId(report.scope, 'detail'),
    generatedAt,
    periodLabel: reportPeriodLabel(report),
    fromLines: [AUTH_BRAND.organization, 'Academic activity report'],
    toTitle: report.subject.name,
    toLines: report.subject.meta.map((m) => `${m.label}: ${m.value}`),
    details: [
      { label: 'Scope', value: meta.plural },
      { label: 'Courses', value: String(report.coverage.courses) },
      ...(report.coverage.students != null
        ? [{ label: 'Students', value: String(report.coverage.students) }]
        : [])
    ]
  });

  const kpiItems = report.kpis
    .filter((k) => k.value !== null)
    .slice(0, 8)
    .map((k) => ({ label: k.label, value: `${k.value}${k.unit ?? ''}` }));

  const sectionsHtml = report.sections
    .filter((s) => s.rows.length > 0)
    .map((section) => {
      const cols = reportTableColumns(section.rows);
      const headers = cols.map(labelForColumn);
      const rows = section.rows.map((r) => cols.map((c) => formatReportCell(c, r[c])));
      return sectionHtml(section.label, tableHtml(headers, rows));
    })
    .join('');

  const body =
    header +
    (kpiItems.length ? kpisRow(kpiItems) : '') +
    sectionsHtml +
    reportFooter(generatedAt);

  printHtmlDocument(`${meta.title} — ${report.subject.name}`, body);
}

export function exportReportListCsv({
  scope,
  plural,
  period,
  rows,
  page,
  pageSize,
  total
}: {
  scope: ReportScope;
  plural: string;
  period: string;
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
}) {
  const cols = reportTableColumns(rows);
  const headerRow = cols.map(labelForColumn);
  const dataRows = rows.map((r) => cols.map((c) => formatReportCell(c, r[c])));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  downloadCsv(
    `${scope}-${plural}-report.csv`,
    [`${plural} report`, periodLabel(period), `Rows ${from}–${to} of ${total}`],
    [headerRow, ...dataRows]
  );
}

export function exportReportListPdf({
  scope,
  plural,
  period,
  rows,
  page,
  pageSize,
  total,
  totalUnfiltered,
  search
}: {
  scope: ReportScope;
  plural: string;
  period: string;
  rows: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  totalUnfiltered: number;
  search: string;
}) {
  const generatedAt = new Date().toLocaleString();
  const meta = REPORT_SCOPE_META[scope];
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const periodText = periodLabel(period);

  const header = buildReportInvoiceHeader({
    documentTitle: `${meta.plural} summary`,
    documentSubtitle: `${from}–${to} of ${total} ${total === 1 ? meta.noun : plural}${
      total !== totalUnfiltered ? ` (filtered from ${totalUnfiltered})` : ''
    }`,
    reportId: entityReportId(scope, 'list'),
    generatedAt,
    periodLabel: periodText,
    fromLines: [AUTH_BRAND.organization, 'Activity summary report'],
    toTitle: meta.plural,
    toLines: [
      `Page ${page}`,
      search ? `Search: ${search}` : 'No search filter'
    ],
    details: [
      { label: 'Scope', value: meta.plural },
      { label: 'Rows on page', value: String(rows.length) }
    ]
  });

  const cols = reportTableColumns(rows);
  const headers = cols.map(labelForColumn);
  const tableRows = rows.map((r) => cols.map((c) => formatReportCell(c, r[c])));
  const table = sectionHtml(
    'Activity counts',
    tableHtml(headers, tableRows, 'No rows on this page.')
  );

  printHtmlDocument(
    `${meta.plural} report`,
    header + table + reportFooter(generatedAt)
  );
}
