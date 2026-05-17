'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DepartmentFormSheet } from './DepartmentFormSheet';
import { useAuthStore } from '@/lib/auth-store';

export function DepartmentFormSheetTrigger() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);

  if (role !== 'SUPER_ADMIN') return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        type='button'
        variant='default'
        className='text-xs md:text-sm'
      >
        + Add Department
      </Button>
      <DepartmentFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
