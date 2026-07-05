import type { PlatformAuditLogEntry } from '@/features/admin/api/admin-api';

function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function auditLogsToCsv(rows: PlatformAuditLogEntry[]): string {
  const headers = [
    'Event ID',
    'Timestamp',
    'User',
    'Email',
    'Role',
    'Action',
    'Action Type',
    'Module',
    'Description',
    'Severity',
    'Status',
    'Resource ID',
    'IP Address',
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.createdAt,
      row.actorName,
      row.actorEmail,
      row.actorRole,
      row.actionLabel,
      row.actionType,
      row.module,
      row.description,
      row.severity,
      row.status,
      row.resourceId,
      row.ipAddress ?? '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}

export function downloadAuditCsv(rows: PlatformAuditLogEntry[], filename = 'audit-logs.csv') {
  const bom = '\uFEFF';
  const blob = new Blob([bom + auditLogsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAuditExcel(rows: PlatformAuditLogEntry[], filename = 'audit-logs.xls') {
  const csv = auditLogsToCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printAuditPdf(rows: PlatformAuditLogEntry[], title = 'Audit Logs Export') {
  const html = `
    <!DOCTYPE html>
    <html><head><title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; font-size: 11px; padding: 24px; }
      h1 { font-size: 18px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
      th { background: #f5f5f5; }
    </style></head><body>
    <h1>${title}</h1>
    <p>Generated ${new Date().toLocaleString()} · ${rows.length} records</p>
    <table>
      <thead><tr>
        <th>Timestamp</th><th>User</th><th>Action</th><th>Module</th>
        <th>Description</th><th>Severity</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
          <td>${new Date(r.createdAt).toLocaleString()}</td>
          <td>${r.actorName ?? '—'}</td>
          <td>${r.actionLabel}</td>
          <td>${r.module}</td>
          <td>${r.description}</td>
          <td>${r.severity}</td>
          <td>${r.status}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
