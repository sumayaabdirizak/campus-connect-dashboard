'use client';

import { useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/lib/auth-store';
import { ProgramFormSheet } from './program-form-sheet';

export function ProgramAddButton() {
  const [open, setOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  if (role !== 'SUPER_ADMIN') return null;

  return (
    <>
      <Button type='button' onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 size-4' /> Add Program
      </Button>
      <ProgramFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
