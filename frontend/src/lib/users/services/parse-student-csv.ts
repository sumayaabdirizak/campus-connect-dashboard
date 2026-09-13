export type StudentCsvRow = { full_name: string; email: string };

export function parseStudentCsv(text: string): {
  rows: StudentCsvRow[];
  parseErrors: string[];
} {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { rows: [], parseErrors: ['No rows found'] };

  const parseErrors: string[] = [];
  const rows: StudentCsvRow[] = [];
  let start = 0;

  const first = lines[0].toLowerCase();
  if (first.includes('full_name') || first.includes('name') || first.includes('email')) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    const full_name = (parts[0] || '').trim();
    const email = (parts[1] || '').trim().toLowerCase();

    if (!full_name && !email) continue;
    if (!full_name || !email) {
      parseErrors.push(`Line ${i + 1}: need full_name and email`);
      continue;
    }
    if (!email.includes('@')) {
      parseErrors.push(`Line ${i + 1}: invalid email`);
      continue;
    }
    rows.push({ full_name, email });
  }

  return { rows, parseErrors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      out.push(cell);
      cell = '';
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

export const STUDENT_CSV_TEMPLATE = `full_name,email
Amina Hassan,amina.hassan@student.jazeera.edu.so
Omar Ali,omar.ali@student.jazeera.edu.so
`;
