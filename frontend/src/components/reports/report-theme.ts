/**
 * Entity reports design tokens — aligned with Campus Connect blue system
 * (messages, clubs, announcements): high contrast, minimal cards, readable tables.
 */

/** Page shell behind report cards */
export const PAGE_BG = 'bg-[#F2F4F7] dark:bg-background';

/** Standard report card */
export const CARD =
  'rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] dark:border-border dark:bg-card';

/** Clickable / hoverable card surface */
export const CARD_HOVER =
  'transition-all duration-200 hover:border-[#98A2B3] hover:shadow-[0_2px_8px_rgba(16,24,40,0.08)]';

/** Single blue accent for all KPI tiles (no rainbow row) */
export const KPI_TILE =
  'bg-[#EFF6FF] text-[#3B82F6] dark:bg-blue-950/50 dark:text-blue-400';

/** Typography */
export const TITLE_LG = 'text-xl font-semibold tracking-tight text-[#101828] dark:text-foreground';
export const TITLE_MD = 'text-base font-semibold tracking-tight text-[#101828] dark:text-foreground';
export const SUBTITLE = 'text-sm text-[#667085] dark:text-muted-foreground';
export const LABEL_SM =
  'text-[11px] font-medium uppercase tracking-wide text-[#667085] dark:text-muted-foreground';
export const KPI_LABEL = 'text-xs font-medium text-[#667085] dark:text-muted-foreground';
export const KPI_VALUE =
  'text-2xl font-semibold tabular-nums tracking-tight text-[#101828] dark:text-foreground';
export const BODY = 'text-sm text-[#344054] dark:text-muted-foreground';
export const META = 'text-xs text-[#667085] dark:text-muted-foreground';

/** Tables */
export const TABLE_HEAD =
  'bg-[#F9FAFB] dark:bg-muted/60 text-[13px] font-semibold text-[#344054] dark:text-foreground';
export const TABLE_ROW = 'border-t border-[#E5E7EB] dark:border-border hover:bg-[#F2F4F7] dark:hover:bg-muted/40';
export const TH = 'px-4 py-3';
export const TD = 'px-4 py-3 text-sm';

/** Legacy export — all KPI cards use the same accent now */
export const KPI_ACCENTS = [{ tile: KPI_TILE, border: 'border-[#E5E7EB] dark:border-border' }] as const;
