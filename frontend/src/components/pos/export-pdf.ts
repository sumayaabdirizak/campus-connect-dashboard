import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

/** Generic table-to-PDF export (browser Print → Save as PDF), shared by every PosTableCard. */
export function exportTablePdf(title: string, header: string[], rows: (string | number)[][]) {
  const thead = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.length
    ? rows
        .map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`)
        .join('')
    : `<tr><td class="empty" colspan="${header.length}">No data</td></tr>`;

  const bodyHtml = `
    <div class="inv-title-row">
      <h1>${escapeHtml(title)}</h1>
      <p class="inv-sub">Generated ${escapeHtml(new Date().toLocaleString())} · ${rows.length} row${rows.length === 1 ? '' : 's'}</p>
    </div>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
  `;

  printHtmlDocument(title, bodyHtml);
}
