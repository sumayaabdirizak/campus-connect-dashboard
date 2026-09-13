import { Label } from '@/features/ui/components/label';
import { cn } from '@/lib/utils';

export function ProfileRow({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-4 px-4 py-3'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span className={cn('truncate text-sm font-medium', mono && 'font-mono tabular-nums')}>
        {value}
      </span>
    </div>
  );
}

export function SettingRow({
  id,
  title,
  description,
  control
}: {
  id?: string;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className='flex items-start justify-between gap-4 px-4 py-3'>
      <div className='min-w-0 space-y-0.5'>
        {id ? (
          <Label htmlFor={id} className='text-sm font-medium'>
            {title}
          </Label>
        ) : (
          <p className='text-sm font-medium'>{title}</p>
        )}
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <div className='shrink-0 pt-0.5'>{control}</div>
    </div>
  );
}
