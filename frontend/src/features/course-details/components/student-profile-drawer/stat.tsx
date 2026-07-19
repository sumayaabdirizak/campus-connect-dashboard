export function rateTone(pct: number): 'emerald' | undefined | 'destructive' {
  if (pct >= 80) return 'emerald';
  if (pct < 60) return 'destructive';
  return undefined;
}

export function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone?: 'emerald' | 'destructive';
}) {
  const colour =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'destructive'
        ? 'text-destructive'
        : '';
  return (
    <div className='border rounded p-2'>
      <p className='text-[10px] uppercase text-muted-foreground tracking-wide'>{label}</p>
      <p className={`text-lg font-semibold ${colour}`}>{value}</p>
    </div>
  );
}
