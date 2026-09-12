import { escapeHtml } from './report-print-shell';
import { REPORT_TABS, type ReportTabId } from './report-tabs';

export function reportTabLabel(tab: ReportTabId): string {
  return REPORT_TABS.find((t) => t.id === tab)?.label ?? tab;
}

export function kpiHtml(label: string, value: string | number) {
  return `<div class="kpi"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

export function kpisRow(items: { label: string; value: string | number }[]) {
  return `<div class="kpis">${items.map((i) => kpiHtml(i.label, i.value)).join('')}</div>`;
}

export function tableHtml(
  headers: string[],
  rows: (string | number)[][],
  empty = 'No rows for this section.'
) {
  if (!rows.length) return `<p class="empty">${escapeHtml(empty)}</p>`;
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map((r) => {
      const cells = headers.map((_, i) => {
        const c = r[i] ?? '';
        const header = headers[i]?.toLowerCase() ?? '';
        const isNum = header === 'marks' || header.includes('mark') || header === '%';
        return `<td class="${isNum ? 'num' : ''}">${escapeHtml(c)}</td>`;
      });
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function sectionHtml(title: string, inner: string) {
  return `<h2>${escapeHtml(title)}</h2>${inner}`;
}
