import type { NavGroup, PermissionCheck } from '@/types';

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
    { title: 'Students', url: '/dashboard/dean/students', icon: 'student', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Lecturers', url: '/dashboard/dean/lecturers', icon: 'teacher', isActive: false, access: { roles: ['DEAN'] } },
    { title: 'Courses', url: '/dashboard/dean/courses', icon: 'fileCheck', isActive: false, access: { roles: ['DEAN'] } },
  ],
};

export const universityStructureNavGroup: NavGroup = {
  label: 'University Structure',
  items: [
    { title: 'Faculties', url: '/dashboard/faculties', icon: 'teams', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Departments', url: '/dashboard/departments', icon: 'userTie', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Programs', url: '/dashboard/programs', icon: 'forms', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Courses', url: '/dashboard/courses', icon: 'fileCheck', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
    { title: 'Batch', url: '/dashboard/batches', icon: 'kanban', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
  ],
};

export const adminNavGroups: NavGroup[] = [
  {
    label: 'User Management',
    items: [
      {
        title: 'Student',
        url: '/dashboard/users?role=STUDENT',
        icon: 'student',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] },
      },
      {
        title: 'Lecturer',
        url: '/dashboard/users?role=TEACHER',
        icon: 'teacher',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] },
      },
      {
        title: 'Dean',
        url: '/dashboard/users?role=DEAN',
        icon: 'userTie',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] },
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Role', url: '/dashboard/admin/roles', icon: 'userCog', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
      { title: 'Audit Log', url: '/dashboard/audit-logs', icon: 'activity', isActive: false, access: { roles: ['SUPER_ADMIN'] } },
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
    {
      title: 'Messages',
      url: '/dashboard/messages',
      icon: 'chat',
      isActive: false,
      access: { roles: ['DEAN', 'TEACHER', 'STUDENT'] },
    },
    { title: 'Announcement', url: '/dashboard/announcements', icon: 'speakerphone', isActive: false, access: {} },
    {
      title: 'Calendar',
      url: '/dashboard/calendar',
      icon: 'calendar',
      isActive: false,
      access: { roles: ['DEAN', 'TEACHER', 'STUDENT'] },
    },
    {
      title: 'Club',
      url: '/dashboard/dean/clubs',
      icon: 'teams',
      isActive: false,
      access: { roles: ['DEAN', 'SUPER_ADMIN'] },
    },
  ],
};

const academicReportRoles: PermissionCheck = {
  roles: ['TEACHER', 'DEAN', 'SUPER_ADMIN'],
};

const aggregateReportRoles: PermissionCheck = {
  roles: ['DEAN', 'SUPER_ADMIN'],
};

export const reportsNavGroup: NavGroup = {
  label: '',
  items: [
    {
      title: 'Report',
      url: '/dashboard/reports/course-reports',
      icon: 'barChart',
      access: academicReportRoles,
      items: [
        {
          title: 'Course Report',
          url: '/dashboard/reports/course-reports',
          icon: 'billing',
          access: academicReportRoles,
        },
        {
          title: 'Student Report',
          url: '/dashboard/reports/student-reports',
          icon: 'profile',
          access: academicReportRoles,
        },
        {
          title: 'Lecturer Report',
          url: '/dashboard/reports/lecturer-reports',
          icon: 'userCog',
          access: aggregateReportRoles,
        },
        {
          title: 'Batch Report',
          url: '/dashboard/reports/batch-reports',
          icon: 'kanban',
          access: aggregateReportRoles,
        },
        {
          title: 'Faculty Report',
          url: '/dashboard/reports/faculty-reports',
          icon: 'barChart',
          access: { roles: ['SUPER_ADMIN'] },
        },
        {
          title: 'Club Report',
          url: '/dashboard/reports/clubs-report',
          icon: 'teams',
          access: aggregateReportRoles,
        },
      ],
    },
  ],
};

export const accountNavGroup: NavGroup = {
  label: 'Account',
  items: [{ title: 'Profile', url: '/dashboard/profile', icon: 'profile', isActive: false, access: {} }],
};
