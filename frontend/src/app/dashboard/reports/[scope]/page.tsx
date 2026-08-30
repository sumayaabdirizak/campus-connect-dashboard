import { redirect } from 'next/navigation';
import { REPORT_SCOPES, type ReportScope } from '@/lib/reports/types';

export default async function ReportScopeRedirectPage({
  params,
  searchParams
}: {
  params: Promise<{ scope: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { scope } = await params;
  const sp = await searchParams;
  const valid = REPORT_SCOPES.includes(scope as ReportScope) ? scope : 'course';
  const q = new URLSearchParams();
  q.set('scope', valid);
  if (sp.id && typeof sp.id === 'string') q.set('id', sp.id);
  redirect(`/dashboard/reports?${q.toString()}`);
}
