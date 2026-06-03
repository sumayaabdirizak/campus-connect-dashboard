import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'warning' | 'info' | 'success' | 'primary';

const TONE: Record<Tone, { varName: string; tint: string; text: string }> = {
  warning: { varName: '--warning', tint: 'bg-warning-muted', text: 'text-warning' },
  info: { varName: '--info', tint: 'bg-info-muted', text: 'text-info' },
  success: { varName: '--success', tint: 'bg-success-muted', text: 'text-success' },
  primary: { varName: '--primary', tint: 'bg-primary/10', text: 'text-primary' }
};

function Donut({ ratio, color, size = 56, stroke = 6 }: { ratio: number; color: string; size?: number; stroke?: number }) {
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
 * Soft pastel stat card with a donut ring — the dashboard's signature widget
 * (matches the reference LMS look). Tinted surface + solid icon badge + big
 * number, all driven by the semantic theme tokens so it themes + dark-modes.
 */
export function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  ratio,
  tone
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
  ratio?: number;
  tone: Tone;
}) {
  const t = TONE[tone];
  const color = `var(${t.varName})`;
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-2xl p-4', t.tint)}>
      <div className='min-w-0'>
        <span
          className='flex size-9 items-center justify-center rounded-xl text-white shadow-sm'
          style={{ backgroundColor: color }}
        >
          <Icon className='size-5' />
        </span>
        <p className='mt-3 text-2xl font-extrabold tracking-tight text-foreground tabular-nums'>{value}</p>
        <p className='text-sm font-semibold text-foreground'>{label}</p>
        {sublabel && <p className='text-xs text-muted-foreground'>{sublabel}</p>}
      </div>
      {ratio != null && <Donut ratio={ratio} color={color} />}
    </div>
  );
}
