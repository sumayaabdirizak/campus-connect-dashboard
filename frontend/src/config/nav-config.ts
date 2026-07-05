import { NavGroup } from '@/types';

/**
 * Campus Connect - Digital Academic Communication Platform
 * Navigation configuration with RBAC support
 */
export const navGroups: NavGroup[] = [
  // ── OVERVIEW (Super Admin, Teacher, Student only) ──────────────────────────
  {
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      }
    ]
  },

  // ── DEAN — SETUP ──────────────────────────────────────────────────────────
  {
    label: 'Setup',
    items: [
      {
        title: 'Departments',
        url: '/dashboard/departments',
        icon: 'forms',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Programs',
        url: '/dashboard/programs',
        icon: 'forms',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Batches',
        url: '/dashboard/dean/batches',
        icon: 'kanban',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Users',
        url: '/dashboard/dean/users',
        icon: 'userCog',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Courses',
        url: '/dashboard/dean/courses',
        icon: 'fileCheck',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Course offerings',
        url: '/dashboard/dean/Assigning',
        icon: 'calendar',
        isActive: false,
        access: { roles: ['DEAN'] }
      }
    ]
  },

  // ── UNIVERSITY STRUCTURE (Super Admin only) ────────────────────────────────
  {
    label: 'University Structure',
    items: [
      {
        title: 'Faculties',
        url: '/dashboard/faculties',
        icon: 'teams',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      },
      {
        title: 'Departments',
        url: '/dashboard/departments',
        icon: 'userTie',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      },
      {
        title: 'Programs',
        url: '/dashboard/programs',
        icon: 'forms',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      }
    ]
  },

  // ── SUPER ADMIN ONLY ───────────────────────────────────────────────────────
  {
    label: 'User Management',
    items: [
      {
        title: 'users',
        url: '/dashboard/users',
        icon: 'userCog',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      }
    ]
  },
  {
    label: 'Admin',
    items: [
      {
        title: 'Reports',
        url: '/dashboard/admin/report',
        icon: 'barChart',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      },
      {
        title: 'Audit Logs',
        url: '/dashboard/audit-logs',
        icon: 'activity',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      }
    ]
  },

  // ── TEACHER PORTAL ─────────────────────────────────────────────────────────
  {
    label: 'Teacher Portal',
    items: [
      {
        title: 'My Courses',
        url: '/dashboard/courses',
        icon: 'billing',
        isActive: false,
        access: { roles: ['TEACHER'] }
      }
    ]
  },

  // ── STUDENT PORTAL ─────────────────────────────────────────────────────────
  {
    label: 'Student Portal',
    items: [
      {
        title: 'My Courses',
        url: '/dashboard/courses',
        icon: 'billing',
        isActive: false,
        access: { roles: ['STUDENT'] }
      }
    ]
  },

  // ── COMMUNICATION (all roles) ──────────────────────────────────────────────
  {
    label: 'Communication',
    items: [
      {
        title: 'Announcements',
        url: '/dashboard/announcements',
        icon: 'notification',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'STUDENT', 'TEACHER'] }
      },
      {
        title: 'Discussions',
        url: '/dashboard/chat',
        icon: 'chat',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      },
      {
        title: 'Calendar',
        url: '/dashboard/calendar',
        icon: 'calendar',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      },
      {
        title: 'Notifications',
        url: '/dashboard/notifications',
        icon: 'notification',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      }
    ]
  },

  // ── DEAN — REPORTS ─────────────────────────────────────────────────────────
  {
    label: 'Reports',
    items: [
      {
        title: 'Reports & Analytics',
        url: '/dashboard/faculty-dean/reports',
        icon: 'barChart',
        isActive: false,
        access: { roles: ['DEAN'] }
      }
    ]
  },

  // ── ACCOUNT ────────────────────────────────────────────────────────────────
  {
    label: 'Account',
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: 'profile',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      }
    ]
  }
];
