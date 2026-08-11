'use client';

import { useAuthStore } from '@/lib/auth-store';
import { AdminDashboard } from '@/components/overview/components/admin-dashboard';
import { SuperAdminDashboard } from '@/components/overview/components/super-admin-dashboard';
import { TeacherDashboard } from '@/components/overview/components/teacher-dashboard';
import { StudentDashboard } from '@/components/overview/components/student-dashboard';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'DEAN':
      return <AdminDashboard />;
    case 'ACADEMIC_OFFICE':
      return <AdminDashboard />;
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    default:
      return <AdminDashboard />;
  }
}
