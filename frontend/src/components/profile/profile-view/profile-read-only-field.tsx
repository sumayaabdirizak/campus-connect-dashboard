import { Label } from '@/features/ui/components/label';

/** Template-looking control that is not focusable or clickable. */
export function ProfileReadOnlyField({
  id,
  label,
  value,
  required,
}: {
  id?: string;
  label: string;
  value: string;
  required?: boolean;
}) {
  return (
    <div className='space-y-1.5'>
      <Label
        htmlFor={id}
        className='pointer-events-none text-sm font-medium text-[#344054]'
      >
        {label}
        {required ? <span className='text-destructive'> *</span> : null}
      </Label>
      <div
        id={id}
        aria-readonly='true'
        className='border-input flex h-9 w-full cursor-default items-center rounded-md border bg-[#F9FAFB] px-3 text-sm text-[#101828] select-none pointer-events-none'
      >
        <span className='truncate'>{value.trim() ? value : '—'}</span>
      </div>
    </div>
  );
}
