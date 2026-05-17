'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FacultyFormSheet } from './FacultyFormSheet'; // If in separate file, adjust path

export function FacultyFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className='text-xs md:text-sm'>
        + Add Faculty
      </Button>
      <FacultyFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
