'use client';

import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BookOpen,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Users,
  Presentation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_TABS, type ReportTabId } from '@/lib/reports/services/report-tabs';

const ICONS: Record<ReportTabId, LucideIcon> = {
  overview: BarChart3,
  enrollment: GraduationCap,
  courses: BookOpen,
  communication: MessageSquare,
  usage: Activity,
  students: Users,
  'user-logs': ShieldCheck,
  'teacher-activity': Presentation,
};

/** Glow color per tab for the active icon */
const TAB_GLOWS: Record<ReportTabId, string> = {
  overview: 'text-[#3B82F6]',
  enrollment: 'text-[#8B5CF6]',
  courses: 'text-[#10B981]',
  communication: 'text-[#F59E0B]',
  usage: 'text-[#06B6D4]',
  students: 'text-[#6366F1]',
  'user-logs': 'text-[#EF4444]',
  'teacher-activity': 'text-[#0EA5E9]',
};

export function ReportsNavTabs({
  value,
  onChange,
}: {
  value: ReportTabId;
  onChange: (id: ReportTabId) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className='relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-1.5 shadow-sm'
    >
      {/* Subtle inner top accent */}
      <div
        className='pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#3B82F6]/30 via-[#8B5CF6]/30 to-transparent'
        aria-hidden
      />
      <ul className='flex flex-wrap gap-1' role='tablist'>
        {REPORT_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const active = value === tab.id;
          return (
            <li key={tab.id} className='relative' role='presentation'>
              <button
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'relative z-10 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? cn(TAB_GLOWS[tab.id], 'font-semibold')
                    : 'text-[#667085] hover:text-[#101828]'
                )}
              >
                {active ? (
                  <motion.span
                    layoutId='reports-tab-pill'
                    className='absolute inset-0 -z-10 rounded-xl bg-white shadow-sm ring-1 ring-[#E5E7EB]'
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <motion.span
                  animate={
                    active && !reduce
                      ? { rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.15, 1] }
                      : { rotate: 0, scale: 1 }
                  }
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                >
                  <Icon className='size-3.5' aria-hidden />
                </motion.span>
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
