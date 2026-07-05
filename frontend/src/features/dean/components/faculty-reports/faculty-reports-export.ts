import type { DeanReports } from '@/features/dean/api/dean-api';

export interface FacultyReportCatalogItem {
  id: string;
  name: string;
  category: 'Academic' | 'Student' | 'Instructor' | 'Course' | 'Department' | 'Assessment';
  description: string;
}

export function buildFacultyReportCatalog(data?: DeanReports): FacultyReportCatalogItem[] {
  const period = data?.scope.periodLabel ?? 'Last 6 months';
  const faculty = data?.scope.facultyName ?? 'Faculty';
  return [
    {
      id: 'gpa-report',
      name: 'GPA Report',
      category: 'Academic',
      description: `Faculty-wide GPA analysis for ${period.toLowerCase()}.`,
    },
    {
      id: 'academic-standing',
      name: 'Academic Standing',
      category: 'Academic',
      description: "Dean's list, probation, and standing distribution.",
    },
    {
      id: 'student-performance',
      name: 'Student Performance',
      category: 'Student',
      description: `Performance and attendance across ${faculty}.`,
    },
    {
      id: 'enrollment-report',
      name: 'Enrollment Report',
      category: 'Student',
      description: 'Enrollment trends, withdrawals, and graduations.',
    },
    {
      id: 'instructor-efficiency',
      name: 'Instructor Efficiency',
      category: 'Instructor',
      description: 'Ratings, completion rates, and grading turnaround.',
    },
    {
      id: 'course-analytics',
      name: 'Course Analytics',
      category: 'Course',
      description: 'Enrollment, completion, and average scores by course.',
    },
    {
      id: 'department-ranking',
      name: 'Department Ranking',
      category: 'Department',
      description: 'Department performance benchmarks and rankings.',
    },
    {
      id: 'assessment-summary',
      name: 'Assessment Summary',
      category: 'Assessment',
      description: 'Assignment, quiz, and examination analytics.',
    },
  ];
}

export function downloadFacultyReportsCsv(data: DeanReports) {
  const rows = [
    ['Metric', 'Value'],
    ['Faculty', data.scope.facultyName],
    ['Period', data.scope.periodLabel],
    ['Departments', String(data.kpis.totalDepartments)],
    ['Students', String(data.kpis.totalStudents)],
    ['Instructors', String(data.kpis.totalInstructors)],
    ['Courses', String(data.kpis.totalCourses)],
    ['Average GPA', String(data.kpis.averageGpa)],
    ['Attendance Rate', `${data.kpis.attendanceRate}%`],
    ['Completion Rate', `${data.kpis.courseCompletionRate}%`],
  ];
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `faculty-reports-${data.scope.facultyCode || 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printFacultyReport(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}
  h1{font-size:18px} table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f5f5f5}</style>
  </head><body><h1>${title}</h1><p>Generated ${new Date().toLocaleString()}</p>${bodyHtml}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
