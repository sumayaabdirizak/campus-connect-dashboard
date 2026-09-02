'use client';

import { Label } from '@/features/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import type { UserFormState } from '@/lib/users/services/user-form-state';

export function UserFormRoleSelect({
  role,
  roleOptions,
  onChange,
}: {
  role: string;
  roleOptions: string[];
  onChange: (patch: Partial<UserFormState>) => void;
}) {
  return (
    <div className='space-y-1.5'>
      <Label>Role</Label>
      <Select
        value={role}
        onValueChange={(nextRole) =>
          onChange({
            role: nextRole,
            facultyId: '',
            departmentId: '',
            departmentCode: '',
            programId: '',
            batchId: '',
            batchSectionId: '',
            academicYearId: '',
            semesterId: '',
            courseIds: [],
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder='Select role' />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((r) => (
            <SelectItem key={r} value={r}>
              {r.replaceAll('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
