'use client';

import { useAuthStore } from '@/lib/auth-store';
import { AdminDashboard } from '@/features/overview/components/admin-dashboard';
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
    case 'SUPER_ADMIN':
    default:
      return <AdminDashboard user={user} />;
  }
}
