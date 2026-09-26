import { AUTH_BRAND } from '@/config/auth-brand';
import { useAuthStore } from '@/lib/auth-store';

export const REPORT_PRINT_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #101828;
    padding: 24px 28px;
    font-size: 11px;
    line-height: 1.45;
    max-width: 1040px;
    margin: 0 auto;
    background: #fff;
  }

  /* —— Document masthead —— */
  .rpt-head { text-align: center; margin-bottom: 14px; }
  .rpt-logo {
    height: 46px;
    width: auto;
    max-width: 220px;
    object-fit: contain;
    display: block;
    margin: 0 auto 6px;
  }
  .rpt-org { font-size: 19px; font-weight: 700; color: #101828; }
  .rpt-doc-title { font-size: 14px; font-weight: 700; color: #344054; margin-top: 2px; }
  .rpt-doc-sub { font-size: 11px; color: #667085; margin-top: 2px; }
  .rpt-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    font-size: 11px;
    color: #344054;
    text-align: left;
  }
  .rpt-meta span:last-child { text-align: right; }
  .rpt-meta-sub { margin-top: 2px; color: #667085; font-size: 10px; }

  /* —— Body —— */
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .kpi {
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 10px 12px;
    background: #F8FAFC;
  }
  .kpi .label { color: #667085; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi .value { font-size: 17px; font-weight: 700; margin-top: 2px; color: #101828; }
  h2 {
    font-size: 12px;
    margin: 16px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #D0D5DD;
    color: #344054;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #C7D2E4; padding: 6px 8px; text-align: left; }
  th {
    background: #4472C4;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0.01em;
    border-color: #4472C4;
  }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #98A2B3; font-style: italic; padding: 8px 0; }

  /* —— Signature footer —— */
  .rpt-foot { margin-top: 40px; }
  .rpt-sigs { display: flex; justify-content: space-between; gap: 40px; }
  .rpt-sig { width: 44%; }
  .rpt-sig.right { text-align: left; }
  .rpt-sig-line { border-top: 1px solid #101828; margin-bottom: 6px; }
  .rpt-sig strong { display: block; font-size: 11px; color: #101828; }
  .rpt-sig span { font-size: 10px; color: #475467; }
  .rpt-foot-org {
    margin-top: 26px;
    text-align: center;
    font-size: 10px;
    color: #475467;
  }
  .rpt-foot-org strong { display: block; font-size: 11px; color: #101828; margin-bottom: 2px; }

  @media print {
    body { padding: 10mm 12mm; max-width: none; }
    .kpi, .rpt-head, .rpt-foot { break-inside: avoid; }
    h2 { break-after: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rpt-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Signature block closing every exported report: preparer on the left,
 * authorising signature on the right, organisation contact centred below.
 */
export function buildReportSignatureFooter(preparedByRole: string, dateLabel: string): string {
  const contact = [AUTH_BRAND.address, AUTH_BRAND.phone, AUTH_BRAND.email]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join(' · ');

  return `
<footer class="rpt-foot">
  <div class="rpt-sigs">
    <div class="rpt-sig">
      <div class="rpt-sig-line"></div>
      <strong>Prepared By: ${escapeHtml(preparedByRole)}</strong>
      <span>Date: ${escapeHtml(dateLabel)}</span>
    </div>
    <div class="rpt-sig right">
      <div class="rpt-sig-line"></div>
      <strong>Office of Registration</strong>
      <span>&nbsp;</span>
    </div>
  </div>
  <div class="rpt-foot-org">
    <strong>${escapeHtml(AUTH_BRAND.organization)}</strong>
    ${contact}
  </div>
</footer>
`;
}

export function printHtmlDocument(title: string, bodyHtml: string) {
  // The signature footer is appended here so every report carries it, whatever
  // the caller assembled above.
  const { preparedByRole, dateLabel } = reportSignatory();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>${REPORT_PRINT_CSS}</style></head>
<body>${bodyHtml}${buildReportSignatureFooter(preparedByRole, dateLabel)}</body></html>`;

  // Prefer a real tab when the browser allows it (user can Save as PDF / keep open).
  // Dropdown menus often break the user-gesture chain, so window.open returns null —
  // fall back to a hidden iframe so print still works.
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const docWin = iframe.contentWindow;
  if (!docWin) {
    document.body.removeChild(iframe);
    return;
  }

  docWin.document.open();
  docWin.document.write(html);
  docWin.document.close();

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  docWin.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    docWin.focus();
    docWin.print();
    // Safari / some browsers skip afterprint — still clean up.
    setTimeout(cleanup, 60_000);
  }, 400);
}

function reportSignatory(): { preparedByRole: string; dateLabel: string } {
  return {
    preparedByRole: currentUserName(),
    dateLabel: new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/** Title-cased role of the signed-in user, e.g. `faculty_dean` → `Faculty Dean`. */
export function currentUserRoleLabel(): string {
  const role = currentUser()?.role;
  if (!role) return 'Authorized Staff';
  return String(role)
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Display name of the signed-in user, for the "Generated by" line. */
export function currentUserName(): string {
  const user = currentUser();
  return user?.full_name || user?.name || user?.email || '—';
}

function currentUser() {
  if (typeof window === 'undefined') return null;
  try {
    return useAuthStore.getState().user;
  } catch {
    return null;
  }
}
