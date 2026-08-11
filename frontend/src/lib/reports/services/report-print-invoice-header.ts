import { AUTH_BRAND } from '@/config/auth-brand';
import { escapeHtml } from './report-print-shell';
import type { ReportTabId } from './report-tabs';

const TAB_CODE: Record<ReportTabId, string> = {
  overview: 'OVW',
  enrollment: 'ENR',
  courses: 'CRS',
  communication: 'COM',
  usage: 'USE',
  students: 'STU',
  'user-logs': 'LOG',
  'teacher-activity': 'TAC',
};

export type ReportInvoiceMeta = {
  documentTitle: string;
  documentSubtitle?: string;
  reportId: string;
  generatedAt: string;
  periodLabel: string;
  fromLines: string[];
  toTitle: string;
  toLines: string[];
  details?: { label: string; value: string }[];
};

function logoSrc(): string {
  if (typeof window === 'undefined') return '/assets/img/brand/sidebarlogo.png';
  return `${window.location.origin}/assets/img/brand/sidebarlogo.png`;
}

function makeReportId(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const t = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  return `${prefix}-${y}${m}${day}-${t}`;
}

export function facultyReportId(tab: ReportTabId = 'overview'): string {
  return makeReportId(`RPT-FAC-${TAB_CODE[tab]}`);
}

export function adminReportId(tab: ReportTabId = 'overview'): string {
  return makeReportId(`RPT-ADM-${TAB_CODE[tab]}`);
}

export function buildReportInvoiceHeader(meta: ReportInvoiceMeta): string {
  const details = meta.details ?? [];
  const detailRows = details
    .map(
      (d) =>
        `<tr><td class="inv-k">${escapeHtml(d.label)}</td><td>${escapeHtml(d.value)}</td></tr>`
    )
    .join('');

  return `
<header class="inv-sheet">
  <div class="inv-top">
    <div class="inv-brand">
      <img class="inv-logo" src="${escapeHtml(logoSrc())}" alt="${escapeHtml(AUTH_BRAND.productName)}" width="140" height="40" />
      <div class="inv-org">
        <div class="inv-product">${escapeHtml(AUTH_BRAND.productName)}</div>
        <div class="inv-uni">${escapeHtml(AUTH_BRAND.organization)}</div>
      </div>
    </div>
    <div class="inv-doc">
      <div class="inv-badge">Official report</div>
      <div class="inv-id">#${escapeHtml(meta.reportId)}</div>
      <div class="inv-date">Date: ${escapeHtml(meta.generatedAt)}</div>
    </div>
  </div>

  <div class="inv-title-row">
    <h1>${escapeHtml(meta.documentTitle)}</h1>
    ${meta.documentSubtitle ? `<p class="inv-sub">${escapeHtml(meta.documentSubtitle)}</p>` : ''}
  </div>

  <div class="inv-parties">
    <div class="inv-party">
      <h3>Report from</h3>
      <p class="inv-party-name">${escapeHtml(AUTH_BRAND.productName)}</p>
      ${meta.fromLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}
    </div>
    <div class="inv-party">
      <h3>Prepared for</h3>
      <p class="inv-party-name">${escapeHtml(meta.toTitle)}</p>
      ${meta.toLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}
    </div>
    <div class="inv-party inv-party-meta">
      <h3>Document details</h3>
      <table class="inv-meta-table">
        <tbody>
          <tr><td class="inv-k">Period</td><td>${escapeHtml(meta.periodLabel)}</td></tr>
          <tr><td class="inv-k">Generated</td><td>${escapeHtml(meta.generatedAt)}</td></tr>
          ${detailRows}
          <tr><td class="inv-k">Status</td><td><span class="inv-status">Final</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</header>
`;
}
