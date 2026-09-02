import { studentInitials } from './helpers';

export function StudentNameCell({ name }: { name: string }) {
  return (
    <div className='flex min-w-0 items-center gap-2.5'>
      <div
        className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary'
        aria-hidden
      >
        {studentInitials(name) || '?'}
      </div>
      <p className='truncate text-sm font-medium'>{name}</p>
    </div>
  );
}
