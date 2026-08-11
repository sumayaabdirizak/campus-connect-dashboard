'use client';

import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { autoIdHint } from '@/lib/users/services/auto-id-hint';

type Props = {
  isEdit: boolean;
  role: string;
  number: string;
  batchNamePreview?: string;
  departmentCode?: string;
  onInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function UserFormUniversityIdField({
  isEdit,
  role,
  number,
  batchNamePreview,
  departmentCode,
  onInput
}: Props) {
  if (isEdit) {
    return (
      <div className='space-y-1.5'>
        <Label htmlFor='number'>
          University ID <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='number'
          name='number'
          value={number}
          onChange={onInput}
          placeholder='e.g. CS-FC-B1-001'
          required
        />
      </div>
    );
  }

  return (
    <div className='space-y-1.5'>
      <Label>University ID</Label>
      <p className='rounded-md border border-dashed border-[#D0D5DD] bg-[#F8FAFC] px-3 py-2 text-sm text-[#475467]'>
        {autoIdHint(role, batchNamePreview, departmentCode || undefined)}
      </p>
    </div>
  );
}
