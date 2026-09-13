'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';

export function GroupRenameForm({
  value,
  onChange,
  onSubmit,
  onCancel
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className='flex gap-1 flex-1 mr-2'
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='h-7 text-sm'
      />
      <Button type='submit' size='sm' className='h-7'>
        Save
      </Button>
      <Button type='button' size='sm' variant='ghost' className='h-7' onClick={onCancel}>
        ✕
      </Button>
    </form>
  );
}
