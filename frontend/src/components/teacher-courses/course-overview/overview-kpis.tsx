'use client';

import {
  AlertCircle,
  ClipboardCheck,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseTabId } from '@/lib/course-details/queries/types';

const TILES: {
  key: string;
  label: string;
  tab: CourseTabId;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  iconTone: string;
}[] = [
  {
    key: 'pending',
    label: 'Pending',
    tab: 'assignments',
    icon: AlertCircle,
    tone: 'bg-[#FFF7ED]',
    iconTone: 'bg-card text-[#C2410C]',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    tab: 'assignments',
    icon: FileText,
    tone: 'bg-primary/10',
    iconTone: 'bg-card text-primary',
  },
  {
    key: 'quizzes',
    label: 'Quizzes',
    tab: 'quizzes',
    icon: ClipboardCheck,
    tone: 'bg-[#F0FDF4]',
    iconTone: 'bg-card text-[#16A34A]',
  },
  {
    key: 'resources',
    label: 'Resources',
    tab: 'resources',
    icon: FolderOpen,
    tone: 'bg-muted',
    iconTone: 'bg-card text-muted-foreground',
  },
];

export function OverviewKpis({
  pending,
  assignments,
  quizzes,
  resources,
  onOpenTab,
}: {
  pending: number;
  assignments: number;
  quizzes: number;
  resources: number;
  onOpenTab?: (tab: CourseTabId) => void;
}) {
  const values: Record<string, number> = {
    pending,
    assignments,
    quizzes,
    resources,
  };

  return (
    <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            type='button'
            onClick={() => onOpenTab?.(tile.tab)}
            className={cn(
              'rounded-xl border border-transparent p-4 text-left transition-opacity hover:opacity-90',
              tile.tone
            )}
          >
            <span
              className={cn(
                'mb-3 flex size-10 items-center justify-center rounded-lg',
                tile.iconTone
              )}
            >
              <Icon className='size-5' />
            </span>
            <p className='text-sm text-muted-foreground'>{tile.label}</p>
            <p className='mt-1 text-2xl font-bold tabular-nums text-foreground'>
              {values[tile.key]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
