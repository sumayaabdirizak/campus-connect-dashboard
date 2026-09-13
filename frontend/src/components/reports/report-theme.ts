/**
 * Entity reports design tokens — aligned with PosTable / DreamsPOS cards
 * (Programs, Batches, Students): theme variables, not hardcoded hex.
 */

/** Page shell behind report cards */
export const PAGE_BG = 'bg-[#F2F4F7] dark:bg-background';

/** Standard card — matches PosTableCard shell */
export const CARD = 'rounded-xl border border-border bg-card';

/** Clickable / hoverable card surface */
export const CARD_HOVER =
  'transition-all duration-200 hover:border-muted-foreground/40 hover:shadow-sm';

/** Single blue accent for KPI tiles */
export const KPI_TILE =
  'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';

/** Typography */
export const TITLE_LG = 'text-xl font-semibold tracking-tight text-foreground';
export const TITLE_MD = 'text-base font-semibold tracking-tight text-foreground';
export const SUBTITLE = 'text-sm text-muted-foreground';
export const LABEL_SM =
  'text-[11px] font-medium uppercase tracking-wide text-muted-foreground';
export const KPI_LABEL = 'text-xs font-medium text-muted-foreground';
export const KPI_VALUE = 'text-2xl font-semibold tabular-nums tracking-tight text-foreground';
export const BODY = 'text-sm text-muted-foreground';
export const META = 'text-xs text-muted-foreground';

/** Link accent inside report copy */
export const LINK_ACCENT =
  'font-medium text-primary underline-offset-2 hover:underline';

/** Legacy export — KPI cards */
export const KPI_ACCENTS = [{ tile: KPI_TILE, border: 'border-border' }] as const;
