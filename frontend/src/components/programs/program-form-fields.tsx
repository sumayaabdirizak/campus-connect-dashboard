'use client';

import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { SearchSelect } from '@/features/ui/components/search-select';
import type { ProgramInput } from '@/lib/programs/services';
import { buildDefaultProgramCode, LEVEL_CODE_PREFIX } from '@/lib/programs/services';

const LEVEL_OPTIONS = [
  { value: 'UNDERGRADUATE', label: 'Undergraduate' },
  { value: 'POSTGRADUATE', label: 'Postgraduate' }
];

const DURATION_OPTIONS = [3, 4, 5, 6].map((years) => ({
  value: String(years),
  label: `${years} years (${years * 2} semesters)`
}));

type DeptOption = { value: string; label: string; sub?: string };

type Props = {
  form: ProgramInput;
  setForm: React.Dispatch<React.SetStateAction<ProgramInput>>;
  isEdit: boolean;
  departmentOptions: DeptOption[];
  selectedDeptCode?: string;
  onLevelChange: (level: string) => void;
  onDepartmentChange: (id: string) => void;
  onCodeChange: (code: string) => void;
};

export function ProgramFormFields({
  form,
  setForm,
  isEdit,
  departmentOptions,
  selectedDeptCode,
  onLevelChange,
  onDepartmentChange,
  onCodeChange
}: Props) {
  return (
    <div className='space-y-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='program-name'>
          Program name <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='program-name'
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder='Bachelor of Computer Science'
        />
      </div>

      <div className='space-y-1.5'>
        <Label>Level</Label>
        <SearchSelect
          options={LEVEL_OPTIONS}
          value={form.level}
          onValueChange={onLevelChange}
          placeholder='Select level'
          searchPlaceholder='Search level...'
        />
      </div>

      <div className='space-y-1.5'>
        <Label>
          Department <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={departmentOptions}
          value={form.departmentId ? String(form.departmentId) : ''}
          onValueChange={onDepartmentChange}
          placeholder='Select department'
          searchPlaceholder='Search department...'
          emptyText='No departments found.'
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='program-code'>
          Code <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='program-code'
          value={form.code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder={buildDefaultProgramCode(form.level, selectedDeptCode || 'CS')}
        />
        {!isEdit ? (
          <p className='text-xs text-muted-foreground'>
            Default: {LEVEL_CODE_PREFIX[form.level]}-
            {selectedDeptCode ? selectedDeptCode : '…'} (level + department). You can edit.
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <Label>Duration (years)</Label>
        <SearchSelect
          options={DURATION_OPTIONS}
          value={String(form.durationYears)}
          onValueChange={(value) =>
            setForm((f) => ({ ...f, durationYears: Number(value) || 4 }))
          }
          placeholder='Select duration'
          searchPlaceholder='Search duration...'
        />
      </div>
    </div>
  );
}
