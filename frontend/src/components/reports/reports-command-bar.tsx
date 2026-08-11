'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LivePulseDot } from '@/components/admin/admin-reports/report-cards';

export function ReportsCommandBar({
  title,
  chips,
  description,
  actions,
}: {
  title: string;
  chips?: string[];
  description?: string;
  actions?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className='relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5'
    >
      {/* Soft gradient wash — DreamsPOS style */}
      <div
        className='pointer-events-none absolute inset-0 bg-gradient-to-br from-[#EFF6FF]/70 via-transparent to-[#F5F3FF]/60'
        aria-hidden
      />

      {/* Branded 3px top accent bar */}
      <div
        className='pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#13B5C9] via-[#0D76E1] to-[#8B5CF6]'
        aria-hidden
      />

      {/* Bottom-right decorative blob */}
      <div
        className='pointer-events-none absolute -right-12 -bottom-12 size-40 rounded-full bg-[#6366F1]/5 blur-3xl'
        aria-hidden
      />

      <div className='relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          {/* Title with live pulse dot */}
          <div className='flex items-center gap-2'>
            <LivePulseDot color='#0D76E1' />
            <h2 className='text-lg font-bold tracking-tight text-[#101828]'>{title}</h2>
          </div>

          {description ? (
            <p className='mt-1 max-w-xl text-sm text-[#667085]'>{description}</p>
          ) : null}

          {chips && chips.length > 0 ? (
            <div className='mt-3 flex flex-wrap gap-2'>
              {chips.map((chip, i) => (
                <motion.span
                  key={chip}
                  initial={reduce ? false : { opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: 0.1 + i * 0.07,
                  }}
                  className='inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8] ring-1 ring-[#BFDBFE]'
                >
                  {chip}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className='relative shrink-0'>{actions}</div> : null}
      </div>
    </motion.div>
  );
}

export function ReportsSectionLabel({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className='mb-3 flex items-end justify-between gap-3'>
      <div>
        <p className='text-xs font-bold uppercase tracking-[0.08em] text-[#98A2B3]'>{title}</p>
        {subtitle ? <p className='mt-0.5 text-sm text-[#667085]'>{subtitle}</p> : null}
      </div>
    </div>
  );
}
