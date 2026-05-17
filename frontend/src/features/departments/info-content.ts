import type { InfobarContent } from '@/components/ui/infobar';

export const departmentsInfoContent: InfobarContent = {
  title: 'Departments',
  sections: [
    {
      title: 'Overview',
      description:
        'Departments belong to a faculty. Each department manages its own programs and staff.'
    },
    {
      title: 'Best Practices',
      description: 'Assign a department head after creation for added responsibility.'
    }
  ]
};
