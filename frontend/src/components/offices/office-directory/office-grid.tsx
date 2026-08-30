'use client';

import { Building2, Inbox, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pastelFor } from '@/lib/pastel';
import { Button } from '@/features/ui/components/button';
import { Skeleton } from '@/features/ui/components/skeleton';
import type { SupportOffice } from '@/lib/offices/types';

export function OfficeGrid({
  offices,
  loading,
  onMessage,
  onOpenInbox,
}: {
  offices: SupportOffice[];
  loading: boolean;
  onMessage: (office: SupportOffice) => void;
  onOpenInbox: (slug: string) => void;
}) {
  if (loading) {
    return (
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-36 rounded-xl' />
        ))}
      </div>
    );
  }

  if (offices.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        No offices are set up yet — ask an administrator to add them.
      </p>
    );
  }

  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {offices.map((office) => {
        const hue = pastelFor(office.slug);
        return (
          <div
            key={office.id}
            className='flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md'
          >
            <div className={cn('flex items-center gap-3 px-4 py-3', hue.tile)}>
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl bg-white/60 dark:bg-black/20',
                  hue.text
                )}
              >
                <Building2 className='size-5' />
              </span>
              <div className='min-w-0'>
                <p className={cn('truncate text-sm font-semibold', hue.text)}>{office.name}</p>
                <p className={cn('text-[11px]', hue.subtext)}>ref {office.codePrefix}-…</p>
              </div>
            </div>
            <div className='flex flex-1 flex-col p-4'>
              <p className='line-clamp-2 flex-1 text-xs text-muted-foreground'>
                {office.description || 'Ask this office anything — replies land right here.'}
              </p>
              <div className='mt-3 flex gap-2'>
                {!office.myStaffRole ? (
                  <Button size='sm' className='flex-1 gap-1.5' onClick={() => onMessage(office)}>
                    <MessageSquarePlus className='size-4' /> Message
                  </Button>
                ) : null}
                {office.myStaffRole ? (
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 gap-1.5'
                    onClick={() => onOpenInbox(office.slug)}
                  >
                    <Inbox className='size-4' /> Inbox
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
