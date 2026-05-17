import { NavGroup } from '@/types';

/**
 * Campus Connect - Digital Academic Communication Platform
 * Navigation configuration with RBAC support
 */
export const navGroups: NavGroup[] = [
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

  // 🏛️ UNIVERSITY STRUCTURE
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
        access: { roles: ['SUPER_ADMIN', 'DEAN'] }
      },
      {
        title: 'Programs',
        url: '/dashboard/programs',
        icon: 'forms',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN'] }
      }
    ]
  },

  // 🎓 DEAN PORTAL
  {
    label: 'Dean Portal',
    items: [
      {
        title: 'Faculty Users',
        url: '/dashboard/dean/users',
        icon: 'userCog',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Batches & Sections',
        url: '/dashboard/dean/batches',
        icon: 'kanban',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Course Management',
        url: '/dashboard/dean/courses',
        icon: 'billing',
        isActive: false,
        access: { roles: ['DEAN'] }
      },
      {
        title: 'Offerings & Assigning',
        url: '/dashboard/dean/Assigning',
        icon: 'userTie',
        isActive: false,
        access: { roles: ['DEAN'] }
      }
    ]
  },

  // SUPER ADMIN–SPECIFIC
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
    label: 'System Settings',
    items: [
      {
        title: 'General',
        url: '/dashboard/settings/general',
        icon: 'settings',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      },
      {
        title: 'Security',
        url: '/dashboard/settings/security',
        icon: 'lock',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      },
      {
        title: 'Integrations',
        url: '/dashboard/settings/integrations',
        icon: 'integration',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      }
    ]
  },
  {
    label: 'Admin',
    items: [
      {
        title: 'Audit Logs',
        url: '/dashboard/audit-logs',
        icon: 'activity',
        isActive: false,
        access: { roles: ['SUPER_ADMIN'] }
      }
    ]
  },

  // 👨‍🏫 TEACHER PORTAL
  {
    label: 'Teacher Portal',
    items: [
      {
        title: 'My Courses',
        url: '/dashboard/courses',
        icon: 'billing',
        isActive: false,
        access: { roles: ['TEACHER'] }
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

  // STUDENT PORTAL
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
        title: 'Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      },
      {
        title: 'Calendar',
        url: '/dashboard/calendar',
        icon: 'media',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      }
    ]
  },
  {
    label: 'Account',
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: 'profile',
        isActive: false,
        access: { roles: ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT'] }
      },

      {
        title: 'Settings',
        url: '/dashboard/settings',
        icon: 'settings',
        isActive: false,
        access: { roles: ['TEACHER'] }
      }
    ]
  }
];
