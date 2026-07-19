import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'warning' | 'info' | 'success' | 'primary';

const TONE: Record<Tone, { varName: string; tint: string }> = {
  warning: { varName: '--warning', tint: 'bg-warning-muted' },
  info: { varName: '--info', tint: 'bg-info-muted' },
  success: { varName: '--success', tint: 'bg-success-muted' },
  primary: { varName: '--primary', tint: 'bg-primary/10' }
};

function Donut({
  ratio,
  color,
  size = 56,
  stroke = 6
}: {
  ratio: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className='relative shrink-0' style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='-rotate-90'>
        <circle cx={size / 2} cy={size / 2} r={r} fill='none' strokeWidth={stroke} stroke={color} strokeOpacity={0.2} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap='round'
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <span className='absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-foreground'>
        {pct}%
      </span>
    </div>
  );
}

/**
 * Soft pastel stat card with an optional donut ring — the dashboard's eye-catch
 * widget. Tinted surface + solid icon badge + big number, all from the semantic
 * theme tokens (themes + dark-mode safe). Omit `ratio` to hide the donut.
 */
export function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  ratio,
  tone,
  href
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
  ratio?: number;
  tone: Tone;
  /** Bento behaviour: makes the tile a deep link (with hover lift + arrow). */
  href?: string;
}) {
  const t = TONE[tone];
  const color = `var(${t.varName})`;
  const body = (
    <>
      <div className='min-w-0'>
        <span
          className='flex size-9 items-center justify-center rounded-xl text-white shadow-sm'
          style={{ backgroundColor: color }}
        >
          <Icon className='size-5' />
        </span>
        <p className='mt-3 text-2xl font-extrabold tracking-tight tabular-nums text-foreground'>{value}</p>
        <p className='text-sm font-semibold text-foreground'>{label}</p>
        {sublabel && <p className='text-xs text-muted-foreground'>{sublabel}</p>}
      </div>
      {ratio != null && <Donut ratio={ratio} color={color} />}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'hover-lift group relative flex items-start justify-between gap-3 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          t.tint
        )}
      >
        <ArrowUpRight
          className='absolute top-3 right-3 size-4 text-foreground/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100'
          aria-hidden
        />
        {body}
      </Link>
    );
  }

  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-2xl p-4', t.tint)}>
      {body}
    </div>
  );
}

/**
 * Bento hero tile — the dashboard's "what do I do right now?" answer (next
 * class, item due, or work waiting to grade). Deep violet in both modes so
 * it anchors the grid; pairs with StatCard tiles around it.
 */
export function HeroTile({
  kicker,
  title,
  meta,
  href,
  icon: Icon,
  className
}: {
  kicker: string;
  title: string;
  meta?: string;
  href?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const inner = (
    <>
      {Icon && (
        <span className='absolute top-4 right-4 flex size-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25'>
          <Icon className='size-5' />
        </span>
      )}
      <p className='text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase'>{kicker}</p>
      <p className='font-display mt-2 text-2xl leading-tight font-bold tracking-tight text-white sm:text-3xl'>
        {title}
      </p>
      {meta && <p className='mt-1.5 text-sm text-white/70'>{meta}</p>}
    </>
  );

  const shell = cn(
    'relative overflow-hidden rounded-2xl bg-[oklch(0.24_0.09_292)] p-5',
    // Soft pastel glow, echoing the sign-in brand panel.
    'before:pointer-events-none before:absolute before:-top-10 before:-right-10 before:size-40 before:rounded-full before:bg-[oklch(0.75_0.13_292)]/25 before:blur-2xl',
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shell, 'hover-lift block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      >
        {inner}
      </Link>
    );
  }
  return <div className={shell}>{inner}</div>;
}
