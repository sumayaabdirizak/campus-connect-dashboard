export function escapeCsvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}

export function downloadCsvFile(filename: string, rows: (string | number)[][]) {
  const csv = '﻿' + rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function csvSection(title: string, headers: string[], body: (string | number)[][]) {
  const rows: (string | number)[][] = [[''], [`# ${title}`], headers];
  if (body.length === 0) {
    rows.push(['(no rows)']);
  } else {
    rows.push(...body);
  }
  return rows;
}
