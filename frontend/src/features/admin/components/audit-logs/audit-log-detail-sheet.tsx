'use client';

import type { PlatformAuditLogEntry } from '@/features/admin/api/admin-api';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function DetailBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>{label}</p>
      <div className='text-sm'>{value ?? '—'}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  let text = '';
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>{label}</p>
      <pre className='max-h-48 overflow-auto rounded-xl border bg-muted/40 p-3 text-[11px] leading-relaxed'>
        {text}
      </pre>
    </div>
  );
}

const severityClass: Record<PlatformAuditLogEntry['severity'], string> = {
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  error: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function AuditLogDetailSheet({
  entry,
  open,
  onOpenChange,
}: {
  entry: PlatformAuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Activity details</SheetTitle>
          <SheetDescription>{entry.description}</SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-6'>
          <section className='space-y-3'>
            <h3 className='text-sm font-semibold'>Event information</h3>
            <div className='grid gap-3 sm:grid-cols-2'>
              <DetailBlock label='Event ID' value={<code className='text-xs'>{entry.id}</code>} />
              <DetailBlock
                label='Timestamp'
                value={new Date(entry.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              />
              <DetailBlock label='User' value={entry.actorName} />
              <DetailBlock label='Role' value={entry.actorRole} />
              <DetailBlock label='Session ID' value={entry.sessionId ?? 'Not recorded'} />
            </div>
          </section>

          <Separator />

          <section className='space-y-3'>
            <h3 className='text-sm font-semibold'>Activity information</h3>
            <div className='flex flex-wrap gap-2'>
              <Badge variant='outline' className='capitalize'>
                {entry.actionLabel}
              </Badge>
              <Badge className={cn('capitalize', severityClass[entry.severity])}>
                {entry.severity}
              </Badge>
              <Badge variant={entry.status === 'success' ? 'default' : 'destructive'}>
                {entry.status}
              </Badge>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <DetailBlock label='Module' value={entry.module} />
              <DetailBlock label='Resource ID' value={String(entry.resourceId ?? '—')} />
              <DetailBlock label='Target' value={entry.targetLabel} />
            </div>
          </section>

          <Separator />

          <section className='space-y-3'>
            <h3 className='text-sm font-semibold'>Technical details</h3>
            <div className='grid gap-3 sm:grid-cols-2'>
              <DetailBlock label='IP address' value={entry.ipAddress ?? 'Not recorded'} />
              <DetailBlock label='Browser' value={entry.browser ?? 'Not recorded'} />
              <DetailBlock label='Device' value={entry.device ?? 'Not recorded'} />
              <DetailBlock label='Operating system' value={entry.operatingSystem ?? 'Not recorded'} />
            </div>
          </section>

          {entry.errorMessage ? (
            <>
              <Separator />
              <section className='space-y-2'>
                <h3 className='text-sm font-semibold text-destructive'>Error message</h3>
                <p className='rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm'>
                  {entry.errorMessage}
                </p>
              </section>
            </>
          ) : null}

          <Separator />

          <section className='space-y-3'>
            <JsonBlock label='Before change' value={entry.before} />
            <JsonBlock label='After change' value={entry.after} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
