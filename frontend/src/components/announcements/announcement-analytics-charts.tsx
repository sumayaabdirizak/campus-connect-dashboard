'use client';

import { useMemo } from 'react';
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
import { Button } from '@/features/ui/components/button';
import type { AnnouncementAnalyticsPayload } from '@/lib/announcements/types';
import { Metric, pct } from './analytics-metric';

export function AnnouncementAnalyticsCharts({
  data,
  isFetching,
  onOpenAck,
}: {
  data: AnnouncementAnalyticsPayload;
  isFetching: boolean;
  onOpenAck: () => void;
}) {
  const chartData = useMemo(() => {
    const series = data.readTimeSeries ?? [];
    return series.map((p) => ({
      ...p,
      label: new Date(p.bucketStart).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric'
      })
    }));
  }, [data.readTimeSeries]);

  const snapshotChart = useMemo(() => {
    const s = [...(data.snapshots ?? [])].reverse();
    return s.map((row) => ({
      ...row,
      label: new Date(row.snapshotAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [data.snapshots]);

  return (
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
        <Button type='button' variant='secondary' className='w-full' onClick={onOpenAck}>
          Acknowledgement roster…
        </Button>
      ) : null}
    </>
  );
}
