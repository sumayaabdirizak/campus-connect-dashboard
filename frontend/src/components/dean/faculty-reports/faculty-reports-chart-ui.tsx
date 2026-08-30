import { Badge } from '@/components/ui/badge';

export const PIE_COLORS = ['#22c55e', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];
export const BAR_COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

export function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <p className='text-sm font-semibold'>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return <p className='text-muted-foreground py-12 text-center text-sm'>{message}</p>;
}

export function priorityBadge(priority: string) {
  if (priority === 'high') return <Badge variant='destructive'>High</Badge>;
  if (priority === 'medium') return <Badge className='bg-amber-500/90 hover:bg-amber-500'>Medium</Badge>;
  return <Badge variant='secondary'>Low</Badge>;
}
