'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CourseModule } from '../../api/resources-types';
import { humanizeType } from '../resource-renderers';
import { RESOURCE_TYPE_VALUES } from '../../schemas/resource';

type FieldApi = {
  state: { value: unknown; meta: { errors: unknown[] } };
  handleBlur: () => void;
  handleChange: (value: unknown) => void;
};

export function ResourceUrlField({
  field,
  onUrlChange,
}: {
  field: FieldApi;
  onUrlChange: (value: string) => void;
}) {
  return (
    <div className='space-y-1'>
      <Label htmlFor='resource-url'>URL</Label>
      <Input
        id='resource-url'
        placeholder='Paste a link to a video, doc, etc.'
        value={String(field.state.value ?? '')}
        onBlur={field.handleBlur}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      {field.state.meta.errors[0] ? (
        <p className='text-xs text-destructive'>{String(field.state.meta.errors[0])}</p>
      ) : null}
    </div>
  );
}

export function ResourceModuleField({
  field,
  modules,
}: {
  field: FieldApi;
  modules: CourseModule[];
}) {
  const value = field.state.value as number | null;
  return (
    <div className='space-y-1.5'>
      <Label>Module</Label>
      <select
        value={value == null ? '__none__' : String(value)}
        onChange={(e) =>
          field.handleChange(e.target.value === '__none__' ? null : Number(e.target.value))
        }
        className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring'
      >
        <option value='__none__'>Ungrouped</option>
        {modules.map((m) => (
          <option key={m.id} value={String(m.id)}>
            {m.title}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ResourceDraftField({ field }: { field: FieldApi }) {
  return (
    <div className='flex items-center justify-between rounded-md border p-3'>
      <div>
        <p className='text-sm font-medium'>Save as draft</p>
        <p className='text-[11px] text-muted-foreground'>Drafts are visible to teachers only.</p>
      </div>
      <Switch
        checked={Boolean(field.state.value)}
        onCheckedChange={field.handleChange}
      />
    </div>
  );
}

export const typeSelectOptions = RESOURCE_TYPE_VALUES.map((t) => ({
  value: t,
  label: humanizeType(t),
}));
