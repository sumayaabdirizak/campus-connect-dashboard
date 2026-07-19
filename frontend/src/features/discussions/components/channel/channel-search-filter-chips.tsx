import type { SearchFilterParams } from '../../api/queries';

export function FilterChips({ filters }: { filters: SearchFilterParams }) {
  const items: { label: string; value: string }[] = [];
  if (filters.from) items.push({ label: 'from', value: filters.from });
  if (filters.has) items.push({ label: 'has', value: filters.has });
  if (filters.before) items.push({ label: 'before', value: filters.before });
  if (filters.after) items.push({ label: 'after', value: filters.after });
  if (items.length === 0) return null;
  return (
    <div className='mt-1.5 flex flex-wrap gap-1 px-1'>
      {items.map((it) => (
        <span
          key={it.label}
          className='inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary'
        >
          <span className='opacity-70'>{it.label}:</span>
          <span>{it.value}</span>
        </span>
      ))}
    </div>
  );
}
