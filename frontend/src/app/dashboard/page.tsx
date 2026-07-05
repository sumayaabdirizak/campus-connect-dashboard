'use client';

import { useAuthStore } from '@/lib/auth-store';
import { AdminDashboard } from '@/features/overview/components/admin-dashboard';
import { SuperAdminDashboard } from '@/features/overview/components/super-admin-dashboard';
import { TeacherDashboard } from '@/features/overview/components/teacher-dashboard';
import { StudentDashboard } from '@/features/overview/components/student-dashboard';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard user={user} />;
    case 'TEACHER':
      return <TeacherDashboard user={user} />;
    case 'DEAN':
      return <AdminDashboard user={user} />;
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard user={user} />;
    default:
      return <AdminDashboard user={user} />;
  }
}
