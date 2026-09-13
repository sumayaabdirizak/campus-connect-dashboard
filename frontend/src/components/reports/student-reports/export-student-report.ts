import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type {
  StudentReportDetail,
  StudentReportListRow
} from '@/lib/teacher-courses/student-report-types';
import {
  buildReportInvoiceHeader,
  entityReportId
} from '@/lib/reports/services/report-print-invoice-header';
import {
  kpisRow,
  sectionHtml,
  tableHtml
} from '@/lib/reports/services/report-print-helpers';
import { escapeHtml, printHtmlDocument } from '@/lib/reports/services/report-print-shell';

function marks(n: number | null | undefined, max?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  const value = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return max != null && max > 0 ? `${value}/${max}` : value;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function xmlEscape(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SheetRow = (string | number)[];

const LIST_HEADERS = [
  'Student',
  'ID',
  'Course',
  'Department',
  'Section',
  'Batch',
  'Overall marks',
  'Status'
] as const;

function listRows(rows: StudentReportListRow[]): SheetRow[] {
  return [
    [...LIST_HEADERS],
    ...rows.map(
      (r) =>
        [
          r.studentName,
          r.studentNumber ?? '',
          `${r.courseCode} — ${r.courseName}`,
          r.department ?? '',
          r.section,
          r.batch ?? '',
          marks(r.overallMarks, r.courseMaxMarks),
          r.status
        ] as SheetRow
    )
  ];
}

export function exportStudentReportsListCsv(rows: StudentReportListRow[]) {
  downloadCsv('student-reports.csv', [...LIST_HEADERS], listRows(rows).slice(1));
}

function excelSheet(name: string, rows: SheetRow[]): string {
  const body = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const text = String(cell ?? '');
            return `<Cell><Data ss:Type="String">${xmlEscape(text)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${body}</Table></Worksheet>`;
}

export function exportStudentReportsListExcel(rows: StudentReportListRow[]) {
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${excelSheet('Students', listRows(rows))}
</Workbook>`;
  downloadBlob(
    'student-reports.xls',
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  );
}

export function exportStudentReportsListWord(rows: StudentReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const head = `<tr>${LIST_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body =
    rows.length === 0
      ? `<tr><td colspan="${LIST_HEADERS.length}">No students</td></tr>`
      : listRows(rows)
          .slice(1)
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
          )
          .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Student reports</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6pt 8pt;text-align:left}th{background:#f3f4f6}</style>
</head><body>
<h1>Student reports</h1>
<p>${escapeHtml(AUTH_BRAND.organization)} · ${rows.length} row(s) · ${escapeHtml(generatedAt)}</p>
<table>${head}${body}</table>
</body></html>`;
  downloadBlob(
    'student-reports.doc',
    new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' })
  );
}

export function exportStudentReportsListPdf(rows: StudentReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Student reports',
    documentSubtitle: 'Students across your courses',
    reportId: entityReportId('course', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Teacher student reports'],
    toTitle: 'Filtered students',
    toLines: [`Rows in export: ${rows.length}`]
  });
  const body = [
    header,
    sectionHtml(
      'Students',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.studentName,
          r.studentNumber ?? '—',
          `${r.courseCode} — ${r.courseName}`,
          r.department ?? '—',
          r.section,
          r.batch ?? '—',
          marks(r.overallMarks, r.courseMaxMarks),
          r.status
        ]),
        'No students to export.'
      )
    )
  ].join('');
  printHtmlDocument('Student reports', body);
}

export function exportStudentReportDetailPdf(report: StudentReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const s = report.student;
  const c = report.course;
  const max = report.classSummary.courseMaxMarks;
  const header = buildReportInvoiceHeader({
    documentTitle: 'Student course report',
    documentSubtitle: 'Individual outcomes for this course offering',
    reportId: entityReportId('course', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Teacher student report'],
    toTitle: s.name,
    toLines: [
      s.number ? `Student ID: ${s.number}` : null,
      `${c.courseCode} — ${c.courseName}`,
      `Section: ${c.section}`,
      c.batch ? `Batch: ${c.batch}` : null
    ].filter(Boolean) as string[]
  });
  const body = [
    header,
    kpisRow([
      { label: 'Overall marks', value: marks(s.overallMarks, max) },
      { label: 'Status', value: s.status },
      { label: 'Quizzes', value: report.content.quizzes },
      { label: 'Assignments', value: report.content.assignments }
    ]),
    sectionHtml(
      'Course content',
      tableHtml(
        ['Type', 'Marks', 'Status'],
        [
          ...report.content.quizItems.map((i) => [
            `Quiz · ${i.title}`,
            marks(i.score ?? null, i.maxMarks ?? null),
            i.status ?? 'Not submitted'
          ]),
          ...report.content.assignmentItems.map((i) => [
            `Assignment · ${i.title}`,
            marks(i.score ?? null, i.maxMarks ?? null),
            i.status ?? 'Not submitted'
          ]),
          ...report.content.resourceItems.map((i) => [
            `Resource · ${i.title}`,
            '—',
            '—'
          ])
        ],
        'No published content.'
      )
    )
  ].join('');
  printHtmlDocument(`Student report — ${s.name}`, body);
}

export function exportStudentReportDetailCsv(report: StudentReportDetail) {
  const s = report.student;
  const c = report.course;
  const max = report.classSummary.courseMaxMarks;
  downloadCsv(
    `student-report-${s.studentId}.csv`,
    ['Field', 'Value'],
    [
      ['Student', s.name],
      ['ID', s.number ?? ''],
      ['Course', `${c.courseCode} — ${c.courseName}`],
      ['Department', c.department ?? ''],
      ['Section', c.section],
      ['Batch', c.batch ?? ''],
      ['Overall marks', marks(s.overallMarks, max)],
      ['Status', s.status],
      ['', ''],
      ['Type', 'Marks', 'Status'],
      ...report.content.quizItems.map((i) => [
        `Quiz · ${i.title}`,
        marks(i.score ?? null, i.maxMarks ?? null),
        i.status ?? 'Not submitted'
      ]),
      ...report.content.assignmentItems.map((i) => [
        `Assignment · ${i.title}`,
        marks(i.score ?? null, i.maxMarks ?? null),
        i.status ?? 'Not submitted'
      ])
    ]
  );
}

export function exportStudentReportDetailExcel(report: StudentReportDetail) {
  const s = report.student;
  const c = report.course;
  const max = report.classSummary.courseMaxMarks;
  const summary: SheetRow[] = [
    ['Field', 'Value'],
    ['Student', s.name],
    ['ID', s.number ?? ''],
    ['Course', `${c.courseCode} — ${c.courseName}`],
    ['Department', c.department ?? ''],
    ['Section', c.section],
    ['Batch', c.batch ?? ''],
    ['Overall marks', marks(s.overallMarks, max)],
    ['Status', s.status]
  ];
  const content: SheetRow[] = [
    ['Type', 'Marks', 'Status'],
    ...report.content.quizItems.map(
      (i) =>
        [
          `Quiz · ${i.title}`,
          marks(i.score ?? null, i.maxMarks ?? null),
          i.status ?? 'Not submitted'
        ] as SheetRow
    ),
    ...report.content.assignmentItems.map(
      (i) =>
        [
          `Assignment · ${i.title}`,
          marks(i.score ?? null, i.maxMarks ?? null),
          i.status ?? 'Not submitted'
        ] as SheetRow
    )
  ];
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${excelSheet('Student', summary)}
${excelSheet('Content', content)}
</Workbook>`;
  downloadBlob(
    `student-report-${s.studentId}.xls`,
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  );
}

export function exportStudentReportDetailWord(report: StudentReportDetail) {
  const s = report.student;
  const c = report.course;
  const max = report.classSummary.courseMaxMarks;
  const generatedAt = new Date().toLocaleString();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(s.name)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6pt 8pt;text-align:left}th{background:#f3f4f6}</style>
</head><body>
<h1>Student course report</h1>
<p>${escapeHtml(AUTH_BRAND.organization)} · Generated ${escapeHtml(generatedAt)}</p>
<table>
<tr><th>Student</th><td>${escapeHtml(s.name)}</td></tr>
<tr><th>ID</th><td>${escapeHtml(s.number ?? '—')}</td></tr>
<tr><th>Course</th><td>${escapeHtml(`${c.courseCode} — ${c.courseName}`)}</td></tr>
<tr><th>Section</th><td>${escapeHtml(c.section)}</td></tr>
<tr><th>Batch</th><td>${escapeHtml(c.batch ?? '—')}</td></tr>
<tr><th>Overall marks</th><td>${escapeHtml(marks(s.overallMarks, max))}</td></tr>
<tr><th>Status</th><td>${escapeHtml(s.status)}</td></tr>
</table>
<h2>Course content</h2>
<table>
<tr><th>Type</th><th>Marks</th><th>Status</th></tr>
${[
  ...report.content.quizItems.map(
    (i) =>
      `<tr><td>${escapeHtml(`Quiz · ${i.title}`)}</td><td>${escapeHtml(marks(i.score ?? null, i.maxMarks ?? null))}</td><td>${escapeHtml(i.status ?? 'Not submitted')}</td></tr>`
  ),
  ...report.content.assignmentItems.map(
    (i) =>
      `<tr><td>${escapeHtml(`Assignment · ${i.title}`)}</td><td>${escapeHtml(marks(i.score ?? null, i.maxMarks ?? null))}</td><td>${escapeHtml(i.status ?? 'Not submitted')}</td></tr>`
  )
].join('') || '<tr><td colspan="3">No published quizzes or assignments.</td></tr>'}
</table>
</body></html>`;
  downloadBlob(
    `student-report-${s.studentId}.doc`,
    new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' })
  );
}
