import type { NavGroup } from '@/types';

export const overviewNavGroup: NavGroup = {
  label: 'Overview',
  items: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: 'dashboard',
      isActive: false,
      shortcut: ['d', 'd'],
      access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] },
    },
  ],
};

export const deanSetupNavGroup: NavGroup = {
  label: 'Setup',
  items: [
    { title: 'Departments', url: '/dashboard/departments', icon: 'forms', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Programs', url: '/dashboard/programs', icon: 'forms', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Batches', url: '/dashboard/dean/batches', icon: 'kanban', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Users', url: '/dashboard/dean/users', icon: 'userCog', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Courses', url: '/dashboard/dean/courses', icon: 'fileCheck', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Course offerings', url: '/dashboard/dean/assigning', icon: 'calendar', isActive: false, access: { roles: ['DEAN'] } },
  ],
};

export const universityStructureNavGroup: NavGroup = {
  label: 'University Structure',
  items: [
    { title: 'Faculties', url: '/dashboard/faculties', icon: 'teams', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Departments', url: '/dashboard/departments', icon: 'userTie', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Programs', url: '/dashboard/programs', icon: 'forms', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
  ],
};

export const adminNavGroups: NavGroup[] = [
  {
    label: 'User Management',
    items: [{ title: 'Users', url: '/dashboard/users', icon: 'userCog', isActive: false, access: { roles: ['SUPER_ADMIN'] } }],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Reports', url: '/dashboard/admin/report', icon: 'barChart', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
      { title: 'Audit Logs', url: '/dashboard/audit-logs', icon: 'activity', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    ],
  },
];

export const teacherPortalNavGroup: NavGroup = {
  label: 'Teacher Portal',
  items: [{ title: 'My Courses', url: '/dashboard/courses', icon: 'billing', isActive: false, access: { roles: ['TEACHER'] } }],
};

export const studentPortalNavGroup: NavGroup = {
  label: 'Student Portal',
  items: [{ title: 'My Courses', url: '/dashboard/courses', icon: 'billing', isActive: false, access: { roles: ['STUDENT'] } }],
};

export const communicationNavGroup: NavGroup = {
  label: 'Communication',
  items: [
    { title: 'Messages', url: '/dashboard/messages', icon: 'chat', isActive: false, access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] } },
    { title: 'Announcements', url: '/dashboard/announcements', icon: 'speakerphone', isActive: false, access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] } },
    { title: 'Calendar', url: '/dashboard/calendar', icon: 'calendar', isActive: false, access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] } },
  ],
};

export const deanReportsNavGroup: NavGroup = {
  label: 'Reports',
  items: [{ title: 'Reports & Analytics', url: '/dashboard/faculty-dean/reports', icon: 'barChart', isActive: false, access: { roles: ['DEAN'] } }],
};

export const accountNavGroup: NavGroup = {
  label: 'Account',
  items: [{ title: 'Profile', url: '/dashboard/profile', icon: 'profile', isActive: false, access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] } }],
};
