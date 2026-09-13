'use client';

import { useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { FacultyFormSheet } from './FacultyFormSheet';
import { useAuthStore } from '@/lib/auth-store';

export function FacultyFormSheetTrigger() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  if (role !== 'SUPER_ADMIN') return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} className='text-xs md:text-sm'>
        + Add Faculty
      </Button>
      <FacultyFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
