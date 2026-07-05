'use client';

import { MainDashboard } from '@/features/overview/components/main-dashboard/main-dashboard';

/** Super admin home — full platform dashboard at `/dashboard`. */
export function SuperAdminDashboard(_props: { user: { full_name?: string } }) {
  return <MainDashboard />;
}
