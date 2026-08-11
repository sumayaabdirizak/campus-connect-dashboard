'use client';

import { Label } from '@/features/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { useOffices } from '@/lib/offices/queries';
import type { UserFormState } from '@/lib/users/services/user-form-state';

/** Shown only for desk staff roles (see `roleRequiresOffice`). */
export function UserFormOfficeFields({
  form,
  onChange
}: {
  form: UserFormState;
  onChange: (patch: Partial<UserFormState>) => void;
}) {
  const { data: offices = [], isLoading } = useOffices();

  return (
    <div className='space-y-3 rounded-md border p-3'>
      <div>
        <p className='text-sm font-medium'>Office assignment</p>
        <p className='text-muted-foreground text-xs'>
          Pick the office this staff member will answer in Messages.
        </p>
      </div>
      <div className='space-y-1.5'>
        <Label>
          Office <span className='text-destructive'>*</span>
        </Label>
        <Select
          value={form.officeId || undefined}
          onValueChange={(v) => onChange({ officeId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading offices…' : 'Select office'} />
          </SelectTrigger>
          <SelectContent>
            {offices.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-1.5'>
        <Label>Office role</Label>
        <Select
          value={form.officeStaffRole}
          onValueChange={(v) => onChange({ officeStaffRole: v as 'AGENT' | 'MANAGER' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='AGENT'>Agent</SelectItem>
            <SelectItem value='MANAGER'>Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
