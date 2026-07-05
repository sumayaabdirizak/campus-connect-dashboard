/** Escape a single CSV cell (RFC 4180-style quoting). */
export function csvEscapeCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Join header + rows into a CSV string. */
export function formatCsv(header, rows) {
  const lines = [
    header.map(csvEscapeCell).join(","),
    ...rows.map((row) => row.map(csvEscapeCell).join(",")),
  ];
  return lines.join("\n");
}
