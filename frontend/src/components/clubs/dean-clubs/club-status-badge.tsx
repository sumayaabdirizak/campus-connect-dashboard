'use client'

export function ClubStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/25',
    PENDING: 'bg-primary/10 text-primary',
    SUSPENDED: 'bg-primary/10 text-primary/80',
    REJECTED: 'bg-destructive/10 text-destructive',
  }
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide ${map[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {status}
    </span>
  )
}
