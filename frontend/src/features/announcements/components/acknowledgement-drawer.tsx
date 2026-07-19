'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { buildApiUrl } from '@/lib/api-config';
import { useAnnouncementAcknowledgements } from '../api/use-announcement-analytics';

export function AcknowledgementDrawer({
  announcementId,
  open,
  onOpenChange,
  acknowledgementRequired,
}: {
  announcementId: number | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  acknowledgementRequired: boolean;
}) {
  const [ackFilter, setAckFilter] = useState<'all' | 'acked' | 'pending'>('all');
  const [ackPage, setAckPage] = useState(1);
  const ackPageSize = 40;

  const ackQuery = useAnnouncementAcknowledgements(
    announcementId,
    open && acknowledgementRequired,
    {
      page: ackPage,
      pageSize: ackPageSize,
      filter: ackFilter
    }
  );

  const ackTotal = ackQuery.data?.totalCount ?? ackQuery.data?.total ?? 0;
  const ackHasNext = ackPage * ackPageSize < ackTotal;

  async function downloadAckCsv() {
    if (announcementId == null) return;
    const url = buildApiUrl(
      `/announcements/${announcementId}/acknowledgements?format=csv&filter=${encodeURIComponent(ackFilter)}`
    );
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Export failed');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `announcement-${announcementId}-acknowledgements.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='max-h-[90vh]'>
        <DrawerHeader className='text-left'>
          <DrawerTitle>Acknowledgements</DrawerTitle>
          <DrawerDescription>
            Filter and export CSV. Large audiences are paginated ({ackPageSize} per page).
          </DrawerDescription>
        </DrawerHeader>
        <div className='flex flex-col gap-3 overflow-hidden px-4 pb-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <Select
              value={ackFilter}
              onValueChange={(v) => {
                setAckFilter(v as 'all' | 'acked' | 'pending');
                setAckPage(1);
              }}
            >
              <SelectTrigger className='w-[160px]'>
                <SelectValue placeholder='Filter' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='acked'>Acknowledged</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                void downloadAckCsv().catch(() => {});
              }}
            >
              Export CSV
            </Button>
            <DrawerClose asChild>
              <Button type='button' variant='ghost' size='sm'>
                Close
              </Button>
            </DrawerClose>
          </div>

          {ackQuery.isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading roster…</p>
          ) : ackQuery.error ? (
            <p className='text-sm text-destructive'>Could not load acknowledgements.</p>
          ) : (
            <>
              <p className='text-xs text-muted-foreground'>
                Total matching filter: {ackTotal}
              </p>
              <ScrollArea className='h-[50vh] rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ackQuery.data?.results ?? []).map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className='max-w-[200px] truncate' title={r.email}>
                          {r.full_name}
                        </TableCell>
                        <TableCell>
                          {r.acknowledged ? (
                            <Badge variant='secondary'>Acked</Badge>
                          ) : (
                            <Badge variant='outline'>Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className='flex items-center justify-between gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={ackPage <= 1}
                  onClick={() => setAckPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className='text-xs text-muted-foreground'>Page {ackPage}</span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!ackHasNext}
                  onClick={() => setAckPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
