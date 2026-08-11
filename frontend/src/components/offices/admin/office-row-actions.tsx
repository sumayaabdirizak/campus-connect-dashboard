'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { useUpdateOffice } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';

export function OfficeRowActions({
  office,
  onManageStaff,
  onEdit
}: {
  office: SupportOffice;
  onManageStaff: (office: SupportOffice) => void;
  onEdit: (office: SupportOffice) => void;
}) {
  const update = useUpdateOffice(office.id);
  const active = office.isActive !== false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type='button' variant='ghost' size='icon' className='size-8' aria-label='Actions'>
          <Icons.ellipsis className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem onClick={() => onEdit(office)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManageStaff(office)}>Manage staff</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={update.isPending}
          onClick={() => void update.mutateAsync({ isActive: !active })}
        >
          {active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
