import {
  buildReportInvoiceHeader,
  entityReportId
} from '@/lib/reports/services/report-print-invoice-header';
import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

/** Generic table-to-PDF export (browser Print → Save as PDF), shared by every PosTableCard. */
export function exportTablePdf(title: string, header: string[], rows: (string | number)[][]) {
  const thead = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.length
    ? rows
        .map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`)
        .join('')
    : `<tr><td class="empty" colspan="${header.length}">No data</td></tr>`;

  const masthead = buildReportInvoiceHeader({
    documentTitle: title,
    reportId: entityReportId('list', 'list'),
    generatedAt: new Date().toLocaleString(),
    periodLabel: 'Current term',
    fromLines: [],
    toTitle: `${rows.length} row${rows.length === 1 ? '' : 's'}`,
    toLines: []
  });

  const bodyHtml = `${masthead}<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;

  printHtmlDocument(title, bodyHtml);
}
