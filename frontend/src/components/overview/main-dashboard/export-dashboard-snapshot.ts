export function exportDashboardSnapshot(kpis: { label: string; value: string | number }[]) {
  const header = 'Metric,Value';
  const rows = kpis.map((k) => `"${k.label}","${k.value}"`);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
