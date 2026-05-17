'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
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
import { Icons } from '@/components/icons';
import type { Announcement } from '../api/types';
import { useAnnouncementAnalytics, useAnnouncementAcknowledgements } from '../api/use-announcement-analytics';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

export function AnnouncementAnalyticsSheet({
  announcement,
  open,
  onOpenChange
}: {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const id = announcement ? Number(announcement.id) : null;
  const validId = id != null && Number.isFinite(id) ? id : null;
  const { data, isLoading, error, refetch, isFetching } = useAnnouncementAnalytics(validId, open);

  const [ackOpen, setAckOpen] = useState(false);
  const [ackFilter, setAckFilter] = useState<'all' | 'acked' | 'pending'>('all');
  const [ackPage, setAckPage] = useState(1);
  const ackPageSize = 40;

  const ackQuery = useAnnouncementAcknowledgements(validId, ackOpen && Boolean(announcement?.acknowledgementRequired), {
    page: ackPage,
    pageSize: ackPageSize,
    filter: ackFilter
  });

  const ackTotal = ackQuery.data?.totalCount ?? ackQuery.data?.total ?? 0;
  const ackHasNext = ackPage * ackPageSize < ackTotal;

  const chartData = useMemo(() => {
    const series = data?.readTimeSeries ?? [];
    return series.map((p) => ({
      ...p,
      label: new Date(p.bucketStart).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric'
      })
    }));
  }, [data?.readTimeSeries]);

  const snapshotChart = useMemo(() => {
    const s = [...(data?.snapshots ?? [])].reverse();
    return s.map((row) => ({
      ...row,
      label: new Date(row.snapshotAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [data?.snapshots]);

  async function downloadAckCsv() {
    if (validId == null) return;
    const url = `${API_BASE}/announcements/${validId}/acknowledgements?format=csv&filter=${encodeURIComponent(ackFilter)}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Export failed');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `announcement-${validId}-acknowledgements.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='right' className='flex w-full flex-col gap-0 sm:max-w-lg'>
          <SheetHeader className='border-b border-border pb-4 text-left'>
            <SheetTitle className='flex items-center gap-2'>
              <Icons.barChart className='size-5' aria-hidden />
              Analytics
            </SheetTitle>
            <SheetDescription className='line-clamp-2'>
              {announcement?.title ?? 'Announcement metrics update about every 30s while this panel is open.'}
            </SheetDescription>
          </SheetHeader>

          <div className='flex flex-1 flex-col gap-4 overflow-hidden p-4'>
            {isLoading && (
              <div className='space-y-2 text-sm text-muted-foreground'>
                <div className='h-32 animate-pulse rounded-lg bg-muted' />
                <div className='h-24 animate-pulse rounded-lg bg-muted' />
              </div>
            )}
            {error && (
              <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
                {error instanceof Error ? error.message : 'Could not load analytics.'}
                <Button type='button' variant='outline' size='sm' className='mt-2' onClick={() => void refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !error && data && (
              <>
                <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  {isFetching ? <span>Refreshing…</span> : <span>Updated {new Date(data.generatedAt).toLocaleTimeString()}</span>}
                </div>

                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                  <Metric label='Readers' value={String(data.uniqueReaders)} />
                  <Metric label='Eligible' value={String(data.eligibleRecipients)} />
                  <Metric label='Read rate' value={pct(data.readRate)} />
                  <Metric label='Likes' value={String(data.likes)} />
                  <Metric label='Link clicks' value={String(data.linkClicks)} />
                  <Metric
                    label='Ack rate'
                    value={data.acknowledgement ? pct(data.acknowledgement.completionRate) : '—'}
                  />
                </div>

                <div className='min-h-[200px] flex-1 space-y-2'>
                  <p className='text-sm font-medium'>Reads over time</p>
                  {chartData.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>No read events in this window yet.</p>
                  ) : (
                    <ResponsiveContainer width='100%' height={200}>
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='label' tick={{ fontSize: 10 }} interval='preserveStartEnd' />
                        <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line
                          type='monotone'
                          dataKey='cumulativeReaders'
                          name='Cumulative readers'
                          stroke='hsl(var(--primary))'
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {snapshotChart.length > 0 ? (
                  <div className='min-h-[160px] space-y-2'>
                    <p className='text-sm font-medium'>Daily snapshots (stored)</p>
                    <ResponsiveContainer width='100%' height={160}>
                      <BarChart data={snapshotChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                        <XAxis dataKey='label' tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey='uniqueReaders' name='Readers' fill='hsl(var(--primary) / 0.55)' radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}

                {data.acknowledgement ? (
                  <Button type='button' variant='secondary' className='w-full' onClick={() => setAckOpen(true)}>
                    Acknowledgement roster…
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Drawer open={ackOpen} onOpenChange={setAckOpen}>
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
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border/80 bg-muted/30 px-3 py-2'>
      <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='text-lg font-semibold tabular-nums'>{value}</p>
    </div>
  );
}
