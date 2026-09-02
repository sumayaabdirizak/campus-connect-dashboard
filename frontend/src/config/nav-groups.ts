import type { NavGroup, PermissionCheck, NavItem } from '@/types';

export const overviewNavGroup: NavGroup = {
  label: 'Overview',
  items: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: 'dashboard',
      isActive: false,
      shortcut: ['d', 'd'],
      access: {},
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
    { title: 'Clubs', url: '/dashboard/dean/clubs', icon: 'teams', isActive: false, access: { roles: ['DEAN'] } },
  ],
};

export const universityStructureNavGroup: NavGroup = {
  label: 'University Structure',
  items: [
    { title: 'Faculties', url: '/dashboard/faculties', icon: 'teams', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Departments', url: '/dashboard/departments', icon: 'userTie', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Programs', url: '/dashboard/programs', icon: 'forms', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Academic Years', url: '/dashboard/academic-years', icon: 'calendar', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Courses', url: '/dashboard/courses', icon: 'fileCheck', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Batches', url: '/dashboard/batches', icon: 'kanban', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
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
      { title: 'Roles', url: '/dashboard/admin/roles', icon: 'userCog', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
      {
        title: 'Clubs',
        url: '/dashboard/dean/clubs',
        icon: 'teams',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] },
      },
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
    { title: 'Messages', url: '/dashboard/messages', icon: 'chat', isActive: false, access: {} },
    { title: 'Announcements', url: '/dashboard/announcements', icon: 'speakerphone', isActive: false, access: {} },
    { title: 'Calendar', url: '/dashboard/calendar', icon: 'calendar', isActive: false, access: {} },
  ],
};

const reportRoles: PermissionCheck = {
  roles: ['SUPER_ADMIN', 'DEAN'],
};

const entityReport = (scope: string, title: string, icon: NavItem['icon']) => ({
  title,
  url: `/dashboard/reports?scope=${scope}&period=all`,
  icon,
  access: reportRoles,
});

export const reportsNavGroup: NavGroup = {
  label: '',
  items: [
    {
      title: 'Reports',
      url: '/dashboard/reports?scope=course&period=all',
      icon: 'barChart',
      access: reportRoles,
      items: [
        entityReport('course', 'Course activity', 'billing'),
        entityReport('section', 'Section activity', 'forms'),
        entityReport('batch', 'Batch activity', 'kanban'),
        entityReport('student', 'Student activity', 'profile'),
        entityReport('teacher', 'Teacher activity', 'userCog'),
        {
          title: 'Platform analytics',
          url: '/dashboard/admin/report',
          icon: 'activity',
          access: { roles: ['SUPER_ADMIN'] },
        },
      ],
    },
  ],
};

export const accountNavGroup: NavGroup = {
  label: 'Account',
  items: [{ title: 'Profile', url: '/dashboard/profile', icon: 'profile', isActive: false, access: {} }],
};
