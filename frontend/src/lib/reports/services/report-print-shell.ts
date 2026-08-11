export const REPORT_PRINT_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #101828;
    padding: 24px 28px;
    font-size: 11px;
    line-height: 1.45;
    max-width: 920px;
    margin: 0 auto;
    background: #fff;
  }

  /* —— Invoice masthead —— */
  .inv-sheet { margin-bottom: 18px; }
  .inv-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #E5E7EB;
  }
  .inv-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .inv-logo {
    height: 40px;
    width: auto;
    max-width: 160px;
    object-fit: contain;
    display: block;
  }
  .inv-product { font-size: 14px; font-weight: 700; color: #101828; }
  .inv-uni { font-size: 11px; color: #667085; margin-top: 1px; }
  .inv-doc { text-align: right; }
  .inv-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #3B82F6;
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    border-radius: 4px;
    padding: 2px 8px;
    margin-bottom: 6px;
  }
  .inv-id { font-size: 15px; font-weight: 700; color: #101828; }
  .inv-date { font-size: 11px; color: #667085; margin-top: 2px; }

  .inv-title-row { padding: 14px 0 12px; }
  .inv-title-row h1 { font-size: 18px; margin: 0; font-weight: 700; color: #101828; }
  .inv-sub { margin: 4px 0 0; color: #667085; font-size: 11px; }

  .inv-parties {
    display: grid;
    grid-template-columns: 1fr 1fr 1.15fr;
    gap: 16px;
    padding: 14px 0 16px;
    border-bottom: 2px solid #3B82F6;
    margin-bottom: 16px;
  }
  .inv-party h3 {
    margin: 0 0 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #667085;
  }
  .inv-party p { margin: 0 0 2px; color: #344054; }
  .inv-party-name { font-weight: 700 !important; color: #101828 !important; margin-bottom: 4px !important; }
  .inv-meta-table { width: 100%; border-collapse: collapse; }
  .inv-meta-table td { border: none; padding: 2px 0; font-size: 11px; vertical-align: top; }
  .inv-k { color: #667085; width: 42%; padding-right: 8px !important; }
  .inv-status {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    color: #027A48;
    background: #ECFDF3;
    border: 1px solid #A6F4C5;
    border-radius: 4px;
    padding: 1px 6px;
  }

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
  th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; }
  th { background: #F2F4F7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #475467; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .empty { color: #98A2B3; font-style: italic; padding: 8px 0; }
  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #E5E7EB;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #98A2B3;
    font-size: 10px;
  }
  .footer strong { color: #667085; }

  @media print {
    body { padding: 10mm 12mm; max-width: none; }
    .inv-parties, .kpi, .inv-top { break-inside: avoid; }
    h2 { break-after: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
    .inv-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printHtmlDocument(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>${REPORT_PRINT_CSS}</style></head>
<body>${bodyHtml}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}
