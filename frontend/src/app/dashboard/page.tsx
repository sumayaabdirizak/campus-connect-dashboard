'use client';

import { useAuthStore } from '@/lib/auth-store';
import { AdminDashboard } from '@/components/overview/admin-dashboard';
import { SuperAdminDashboard } from '@/components/overview/super-admin-dashboard';
import { TeacherDashboard } from '@/components/overview/teacher-dashboard';
import { StudentDashboard } from '@/components/overview/student-dashboard';

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
