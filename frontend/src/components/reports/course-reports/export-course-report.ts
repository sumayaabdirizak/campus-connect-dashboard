import { AUTH_BRAND } from '@/config/auth-brand';
import { downloadCsv } from '@/features/pos/components/download-csv';
import type {
  CourseReportDetail,
  CourseReportListRow
} from '@/lib/teacher-courses/course-report-types';
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

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

function marks(
  n: number | null | undefined,
  max?: number | null
): string {
  if (n == null || Number.isNaN(n)) return '—';
  const value = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return max != null && max > 0 ? `${value}/${max}` : value;
}

function reportTitle(report: CourseReportDetail): string {
  return `${report.course.courseCode} — ${report.course.courseName}`;
}

function reportSlug(report: CourseReportDetail): string {
  return report.course.courseCode.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'course';
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

function buildReportSections(report: CourseReportDetail): {
  meta: SheetRow[];
  summary: SheetRow[];
  quizzes: SheetRow[];
  assignments: SheetRow[];
  resources: SheetRow[];
  failed: SheetRow[];
  students: SheetRow[];
} {
  const c = report.course;
  return {
    meta: [
      ['Course', reportTitle(report)],
      ['Section', c.section],
      ...(c.batch ? [['Batch', c.batch] as SheetRow] : []),
      ...(c.department ? [['Department', c.department] as SheetRow] : []),
      ['Generated', new Date(report.generatedAt || Date.now()).toLocaleString()],
      ['Organization', AUTH_BRAND.organization]
    ],
    summary: [
      ['Metric', 'Value'],
      ['Quizzes', report.content.quizzes],
      ['Assignments', report.content.assignments],
      ['Resources', report.content.resources],
      ['Students', report.classSummary.studentCount],
      [
        'Avg overall marks',
        marks(
          report.classSummary.avgOverallMarks ?? report.classSummary.avgOverallPct,
          report.classSummary.courseMaxMarks
        )
      ],
      ['Passed', report.classSummary.passedCount],
      ['Failed', report.classSummary.failedCount],
      ['Missing', report.classSummary.missingCount ?? 0],
      ['No grade', report.classSummary.noGradeCount ?? 0],
      ['Not submitted', report.classSummary.notSubmittedCount ?? 0]
    ],
    quizzes: [
      ['Title'],
      ...report.content.quizItems.map((i) => [i.title] as SheetRow)
    ],
    assignments: [
      ['Title'],
      ...report.content.assignmentItems.map((i) => [i.title] as SheetRow)
    ],
    resources: [
      ['Title', 'Type'],
      ...report.content.resourceItems.map(
        (i) => [i.title, i.type ?? ''] as SheetRow
      )
    ],
    failed: [
      ['Student', 'ID', 'Overall marks'],
      ...report.failedStudents.map(
        (s) =>
          [
            s.name,
            s.number ?? '',
            marks(
              s.overallMarks ?? s.overallPct,
              report.classSummary.courseMaxMarks
            )
          ] as SheetRow
      )
    ],
    students: [
      ['Student', 'ID', 'Overall marks', 'Status'],
      ...report.students.map(
        (s) =>
          [
            s.name,
            s.number ?? '',
            marks(s.overallMarks, report.classSummary.courseMaxMarks),
            s.status
          ] as SheetRow
      )
    ]
  };
}

/** CSV: summary + student roster in one file. */
export function exportCourseReportCsv(report: CourseReportDetail) {
  const sections = buildReportSections(report);
  const rows: SheetRow[] = [
    ['Course report'],
    ...sections.meta,
    [],
    ['Class summary'],
    ...sections.summary,
    [],
    ['Quizzes posted'],
    ...sections.quizzes,
    [],
    ['Assignments posted'],
    ...sections.assignments,
    [],
    ['Resources posted'],
    ...sections.resources,
    [],
    ['Failed students (below 60%)'],
    ...sections.failed,
    [],
    ['All students'],
    ...sections.students
  ];

  downloadCsv(
    `course-report-${reportSlug(report)}.csv`,
    [reportTitle(report)],
    rows
  );
}

function excelSheet(name: string, rows: SheetRow[]): string {
  const body = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const text = String(cell ?? '');
            const isNum =
              text !== '' &&
              text !== '—' &&
              !text.endsWith('%') &&
              Number.isFinite(Number(text));
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${xmlEscape(text)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${body}</Table></Worksheet>`;
}

/** Excel-compatible SpreadsheetML (.xls) — opens natively in Excel / LibreOffice. */
export function exportCourseReportExcel(report: CourseReportDetail) {
  const sections = buildReportSections(report);
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${excelSheet('Summary', [...sections.meta, [], ...sections.summary])}
${excelSheet('Quizzes', sections.quizzes)}
${excelSheet('Assignments', sections.assignments)}
${excelSheet('Resources', sections.resources)}
${excelSheet('Failed students', sections.failed)}
${excelSheet('All students', sections.students)}
</Workbook>`;

  downloadBlob(
    `course-report-${reportSlug(report)}.xls`,
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  );
}

function wordTable(headers: string[], rows: SheetRow[]): string {
  const head = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const dataRows = rows.slice(1);
  const body =
    dataRows.length === 0
      ? `<tr><td colspan="${headers.length}">None</td></tr>`
      : dataRows
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
          )
          .join('');
  return `<table>${head}${body}</table>`;
}

/** Word-compatible HTML document (.doc) — opens in Microsoft Word. */
export function exportCourseReportWord(report: CourseReportDetail) {
  const sections = buildReportSections(report);
  const title = reportTitle(report);
  const generatedAt = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} — Course report</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; }
  p.meta { color: #555; margin: 0 0 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 12pt; }
  th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
  <h1>Course report</h1>
  <p class="meta">${escapeHtml(AUTH_BRAND.organization)} · ${escapeHtml(title)} · Generated ${escapeHtml(generatedAt)}</p>
  <h2>Course details</h2>
  ${wordTable(['Field', 'Value'], [['Field', 'Value'], ...sections.meta])}
  <h2>Class summary</h2>
  ${wordTable(['Metric', 'Value'], sections.summary)}
  <h2>Quizzes posted</h2>
  ${wordTable(['Title'], sections.quizzes)}
  <h2>Assignments posted</h2>
  ${wordTable(['Title'], sections.assignments)}
  <h2>Resources posted</h2>
  ${wordTable(['Title', 'Type'], sections.resources)}
  <h2>Failed students (below 60%)</h2>
  ${wordTable(['Student', 'ID', 'Overall marks'], sections.failed)}
  <h2>All students</h2>
  ${wordTable(['Student', 'ID', 'Overall marks', 'Status'], sections.students)}
  <p class="meta">${escapeHtml(AUTH_BRAND.productName)} · Teacher course report</p>
</body>
</html>`;

  downloadBlob(
    `course-report-${reportSlug(report)}.doc`,
    new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' })
  );
}

const LIST_HEADERS = [
  'Code',
  'Course',
  'Department',
  'Section',
  'Batch',
  'Students',
  'Quizzes',
  'Assignments',
  'Resources',
  'Failed',
  'Avg marks'
] as const;

function listSheetRows(rows: CourseReportListRow[]): SheetRow[] {
  return [
    [...LIST_HEADERS],
    ...rows.map(
      (r) =>
        [
          r.courseCode,
          r.courseName,
          r.department ?? '',
          r.section,
          r.batch ?? '',
          r.students,
          r.quizzes,
          r.assignments,
          r.resources,
          r.failed,
          marks(r.avgOverallMarks ?? r.avgOverallPct, r.courseMaxMarks)
        ] as SheetRow
    )
  ];
}

/** CSV for the teacher course-reports list (all / filtered courses). */
export function exportCourseReportsListCsv(rows: CourseReportListRow[]) {
  downloadCsv('course-reports-all.csv', [...LIST_HEADERS], listSheetRows(rows).slice(1));
}

/** Excel workbook for all / filtered courses. */
export function exportCourseReportsListExcel(rows: CourseReportListRow[]) {
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${excelSheet('All courses', listSheetRows(rows))}
</Workbook>`;

  downloadBlob(
    'course-reports-all.xls',
    new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  );
}

/** Word document for all / filtered courses. */
export function exportCourseReportsListWord(rows: CourseReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const dataRows = listSheetRows(rows);
  const head = `<tr>${LIST_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body =
    rows.length === 0
      ? `<tr><td colspan="${LIST_HEADERS.length}">No courses</td></tr>`
      : dataRows
          .slice(1)
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
          )
          .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>All course reports</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  p.meta { color: #555; margin: 0 0 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 12pt; }
  th, td { border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
  <h1>All course reports</h1>
  <p class="meta">${escapeHtml(AUTH_BRAND.organization)} · ${rows.length} course${rows.length === 1 ? '' : 's'} · Generated ${escapeHtml(generatedAt)}</p>
  <table>${head}${body}</table>
  <p class="meta">${escapeHtml(AUTH_BRAND.productName)} · Teacher course reports</p>
</body>
</html>`;

  downloadBlob(
    'course-reports-all.doc',
    new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' })
  );
}

/** Printable PDF for all / filtered courses. */
export function exportCourseReportsListPdf(rows: CourseReportListRow[]) {
  const generatedAt = new Date().toLocaleString();
  const header = buildReportInvoiceHeader({
    documentTitle: 'Course reports',
    documentSubtitle: 'All courses — content and outcomes summary',
    reportId: entityReportId('course', 'list'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Teacher course reports'],
    toTitle: 'All courses',
    toLines: [`Courses in export: ${rows.length}`]
  });

  const body = [
    header,
    sectionHtml(
      'Courses',
      tableHtml(
        [...LIST_HEADERS],
        rows.map((r) => [
          r.courseCode,
          r.courseName,
          r.department ?? '—',
          r.section,
          r.batch ?? '—',
          r.students,
          r.quizzes,
          r.assignments,
          r.resources,
          r.failed,
          marks(r.avgOverallMarks ?? r.avgOverallPct, r.courseMaxMarks)
        ]),
        'No courses to export.'
      )
    ),
  ].join('');

  printHtmlDocument('Course reports — All courses', body);
}

export function exportCourseReportPdf(report: CourseReportDetail) {
  const generatedAt = new Date().toLocaleString();
  const c = report.course;
  const title = reportTitle(report);

  const header = buildReportInvoiceHeader({
    documentTitle: 'Course report',
    documentSubtitle: 'Content posted and student outcomes',
    reportId: entityReportId('course', 'detail'),
    generatedAt,
    periodLabel: 'Current term',
    fromLines: [AUTH_BRAND.organization, 'Teacher course report'],
    toTitle: title,
    toLines: [
      `Section: ${c.section}`,
      c.batch ? `Batch: ${c.batch}` : null,
      c.department ? `Department: ${c.department}` : null
    ].filter(Boolean) as string[]
  });

  const body = [
    header,
    kpisRow([
      { label: 'Quizzes', value: report.content.quizzes },
      { label: 'Assignments', value: report.content.assignments },
      { label: 'Resources', value: report.content.resources },
      { label: 'Students', value: report.classSummary.studentCount }
    ]),
    kpisRow([
      { label: 'Avg marks', value: marks(report.classSummary.avgOverallMarks ?? report.classSummary.avgOverallPct, report.classSummary.courseMaxMarks) },
      { label: 'Passed', value: report.classSummary.passedCount },
      { label: 'Failed', value: report.classSummary.failedCount },
      { label: 'Missing', value: report.classSummary.missingCount ?? 0 },
      { label: 'No grade', value: report.classSummary.noGradeCount ?? 0 },
      { label: 'Not submitted', value: report.classSummary.notSubmittedCount ?? 0 }
    ]),
    sectionHtml(
      'Quizzes posted',
      tableHtml(
        ['Title'],
        report.content.quizItems.map((i) => [i.title]),
        'No quizzes published.'
      )
    ),
    sectionHtml(
      'Assignments posted',
      tableHtml(
        ['Title'],
        report.content.assignmentItems.map((i) => [i.title]),
        'No assignments published.'
      )
    ),
    sectionHtml(
      'Resources posted',
      tableHtml(
        ['Title', 'Type'],
        report.content.resourceItems.map((i) => [i.title, i.type ?? '']),
        'No resources published.'
      )
    ),
    sectionHtml(
      'Failed students (below 60%)',
      tableHtml(
        ['Student', 'ID', 'Overall marks'],
        report.failedStudents.map((s) => [
          s.name,
          s.number ?? '—',
          marks(s.overallMarks ?? s.overallPct, report.classSummary.courseMaxMarks)
        ]),
        'No failed students.'
      )
    ),
    sectionHtml(
      'All students',
      tableHtml(
        ['Student', 'ID', 'Overall marks', 'Status'],
        report.students.map((s) => [
          s.name,
          s.number ?? '—',
          marks(s.overallMarks, report.classSummary.courseMaxMarks),
          s.status
        ])
      )
    ),
  ].join('');

  printHtmlDocument(`Course report — ${title}`, body);
}

/** Single-student report printable from a course detail payload. */
export async function exportStudentCourseReportPdf(
  report: CourseReportDetail,
  student: CourseReportDetail['students'][number]
) {
  const { getStudentReportDetail } = await import('@/lib/teacher-courses/services');
  const { exportStudentReportDetailPdf } = await import(
    '@/components/reports/student-reports/export-student-report'
  );
  const detail = await getStudentReportDetail(student.studentId, report.course.id);
  exportStudentReportDetailPdf(detail);
}
