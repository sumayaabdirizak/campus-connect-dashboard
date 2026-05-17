import type { InfobarContent } from '@/components/ui/infobar';

export const facultiesInfoContent: InfobarContent = {
  title: 'Faculties',
  sections: [
    {
      title: 'Overview',
      description:
        "Manage your university's faculties here. Add, update, view, or remove faculties."
    },
    {
      title: 'Structure',
      description: 'Each faculty may have multiple departments and programs.'
    }
  ]
};
