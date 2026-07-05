import type { PlatformAnalytics } from '@/features/admin/api/admin-api';

export interface ReportCatalogItem {
  id: string;
  name: string;
  category: 'Academic' | 'Users' | 'Courses' | 'Assessment' | 'Operations';
  description: string;
  status: 'ready' | 'generating';
}

export function buildReportCatalog(data?: PlatformAnalytics): ReportCatalogItem[] {
  const period = data?.scope.periodLabel ?? 'Last 6 months';
  return [
    {
      id: 'academic-performance',
      name: 'Academic Performance Summary',
      category: 'Academic',
      description: `GPA trends, attendance, and completion for ${period.toLowerCase()}.`,
      status: 'ready',
    },
    {
      id: 'user-engagement',
      name: 'User Engagement Report',
      category: 'Users',
      description: 'Registrations, active users, and role distribution.',
      status: 'ready',
    },
    {
      id: 'course-enrollment',
      name: 'Course Enrollment Analysis',
      category: 'Courses',
      description: 'Most and least enrolled courses with completion rates.',
      status: 'ready',
    },
    {
      id: 'assessment-overview',
      name: 'Assessment Overview',
      category: 'Assessment',
      description: 'Quiz and assignment statistics with pass/fail trends.',
      status: 'ready',
    },
    {
      id: 'platform-usage',
      name: 'Platform Usage Report',
      category: 'Operations',
      description: 'Daily visits, messaging volume, and resource views.',
      status: 'ready',
    },
    {
      id: 'department-comparison',
      name: 'Department Comparison',
      category: 'Academic',
      description: 'Department-level performance and completion benchmarks.',
      status: 'ready',
    },
  ];
}

export function reportsToCsv(reports: ReportCatalogItem[], generatedAt: string): string {
  const header = 'Report Name,Category,Description,Status,Generated At';
  const rows = reports.map((r) =>
    [r.name, r.category, r.description, r.status, generatedAt]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadReportsCsv(reports: ReportCatalogItem[]) {
  const csv = reportsToCsv(reports, new Date().toISOString());
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'admin-reports.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function printReportsPdf(title: string, bodyHtml: string) {
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
