export type DashboardKpiTone =
  | 'indigo'
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'cyan';

export type DashboardKpiStatus = 'positive' | 'negative' | 'neutral' | 'warning';

export const statusDot: Record<DashboardKpiStatus, string> = {
  positive: 'bg-success',
  negative: 'bg-destructive',
  neutral: 'bg-muted-foreground/50',
  warning: 'bg-warning'
};

export const toneStyles: Record<
  DashboardKpiTone,
  {
    card: string;
    icon: string;
    value: string;
    glow: string;
  }
> = {
  indigo: {
    card: '',
    icon: 'bg-secondary text-primary',
    value: 'text-foreground',
    glow: 'from-primary/20'
  },
  sky: {
    card: '',
    icon: 'bg-secondary text-primary',
    value: 'text-foreground',
    glow: 'from-primary/15'
  },
  emerald: {
    card: '',
    icon: 'bg-success-muted text-success',
    value: 'text-foreground',
    glow: 'from-success/20'
  },
  violet: {
    card: '',
    icon: 'bg-secondary text-primary',
    value: 'text-foreground',
    glow: 'from-primary/20'
  },
  amber: {
    card: '',
    icon: 'bg-warning-muted text-warning',
    value: 'text-foreground',
    glow: 'from-warning/20'
  },
  rose: {
    card: '',
    icon: 'bg-destructive/10 text-destructive',
    value: 'text-foreground',
    glow: 'from-destructive/15'
  },
  orange: {
    card: '',
    icon: 'bg-secondary text-primary',
    value: 'text-foreground',
    glow: 'from-primary/15'
  },
  cyan: {
    card: '',
    icon: 'bg-success-muted text-success',
    value: 'text-foreground',
    glow: 'from-success/15'
  }
};
