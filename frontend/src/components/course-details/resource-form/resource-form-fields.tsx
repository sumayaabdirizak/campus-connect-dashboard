'use client';

import { FieldLabel } from '@/features/ui/components/field';
import { Input } from '@/features/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { Switch } from '@/features/ui/components/switch';
import type { CourseModule } from '@/lib/course-details/types';

/// Sentinel for "no module" — Radix Select can't hold an empty-string value.
const NO_MODULE = '__none__';

type FieldApi = {
  state: { value: unknown; meta: { errors: unknown[] } };
  handleBlur: () => void;
  handleChange: (value: unknown) => void;
};

export function ResourceUrlField({
  field,
  onUrlChange
}: {
  field: FieldApi;
  onUrlChange: (value: string) => void;
}) {
  return (
    <div className='flex w-full flex-col gap-3 [&>*]:w-full'>
      <FieldLabel htmlFor='resource-url'>URL</FieldLabel>
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
  modules
}: {
  field: FieldApi;
  modules: CourseModule[];
}) {
  const value = field.state.value as number | null;
  // Same Select primitive as the Type field beside it — this was a bare
  // native <select>, which sat in the same row wearing a different chevron,
  // focus ring and corner radius.
  // Wrapper + label mirror what FormSelectField renders for the Type field
  // next to it, so the two triggers land on the same baseline. They used to
  // sit 11px apart — same row, visibly misaligned.
  return (
    <div className='flex w-full flex-col gap-3 [&>*]:w-full'>
      <FieldLabel htmlFor='resource-module'>Module</FieldLabel>
      <Select
        value={value == null ? NO_MODULE : String(value)}
        onValueChange={(v) => field.handleChange(v === NO_MODULE ? null : Number(v))}
        onOpenChange={(open) => {
          if (!open) field.handleBlur();
        }}
      >
        <SelectTrigger id='resource-module' className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_MODULE}>Ungrouped</SelectItem>
          {modules.map((m) => (
            <SelectItem key={m.id} value={String(m.id)}>
              {m.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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

/// What a teacher can pick when adding a resource. Deliberately narrower
/// than the ResourceType enum: SYLLABUS and ASSIGNMENT are inactive in the
/// backend catalog (`GET /api/resources/types` omits them) and saving one
/// fails with "Resource type is not available", so offering them was a dead
/// end. OTHER is dropped as a catch-all nobody needs to choose.
///
/// Old resources on any retired type still display fine — `humanizeType`
/// keeps every case, and the zod union still accepts them so editing an
/// existing SYLLABUS row doesn't fail validation.
export const typeSelectOptions = [
  { value: 'LECTURE_NOTE', label: 'File' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'EXTERNAL_LINK', label: 'Link' }
] as const;
