import type { InfobarContent } from '@/components/ui/infobar';

export const workspacesInfoContent: InfobarContent = {
  title: 'Faculty & Departments',
  sections: [
    {
      title: 'Overview',
      description:
        'Manage the academic divisions of the university. Each faculty contains multiple departments and programs.',
      links: []
    },
    {
      title: 'Departmental Structure',
      description:
        'Departments are organized under their respective faculties. Access levels for department heads can be configured here.',
      links: []
    }
  ]
};

export const teamInfoContent: InfobarContent = {
  title: 'Academic Staff Management',
  sections: [
    {
      title: 'Overview',
      description:
        'Manage the teaching and administrative staff for your faculty. You can assign roles such as Dean, Head of Department, and Senior Lecturer.',
      links: []
    },
    {
      title: 'Staff Roles',
      description:
        'Each staff member is assigned a specific role that determines their level of access to student data and course management tools.',
      links: []
    }
  ]
};

export const billingInfoContent: InfobarContent = {
  title: 'System Quotas',
  sections: [
    {
      title: 'Resource Limits',
      description:
        'View and manage the storage and user limits for the current academic year. These quotas are set by the University IT Department.',
      links: []
    }
  ]
};

export const productInfoContent: InfobarContent = {
  title: 'Course Materials',
  sections: [
    {
      title: 'Digital Resources',
      description:
        'Manage the digital library and course materials. Uploaded files are categorized by course code and semester.',
      links: []
    }
  ]
};
