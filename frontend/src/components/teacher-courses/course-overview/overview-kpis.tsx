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
    iconTone: 'bg-white text-[#C2410C]',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    tab: 'assignments',
    icon: FileText,
    tone: 'bg-[#EFF6FF]',
    iconTone: 'bg-white text-[#3B82F6]',
  },
  {
    key: 'quizzes',
    label: 'Quizzes',
    tab: 'quizzes',
    icon: ClipboardCheck,
    tone: 'bg-[#F0FDF4]',
    iconTone: 'bg-white text-[#16A34A]',
  },
  {
    key: 'resources',
    label: 'Resources',
    tab: 'resources',
    icon: FolderOpen,
    tone: 'bg-[#F8FAFC]',
    iconTone: 'bg-white text-[#475467]',
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
                'mb-3 flex size-10 items-center justify-center rounded-lg shadow-sm',
                tile.iconTone
              )}
            >
              <Icon className='size-5' />
            </span>
            <p className='text-sm text-[#667085]'>{tile.label}</p>
            <p className='mt-1 text-2xl font-bold tabular-nums text-[#101828]'>
              {values[tile.key]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
