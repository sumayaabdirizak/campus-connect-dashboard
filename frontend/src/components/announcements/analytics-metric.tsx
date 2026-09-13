export function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border/80 bg-muted/30 px-3 py-2'>
      <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='text-lg font-semibold tabular-nums'>{value}</p>
    </div>
  );
}
