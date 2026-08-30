/**
 * Shared Batches/Sections table palette (matches list UI).
 *
 * These are applied as inline `style` values, which no `dark:` class variant
 * can reach — so they were hardcoded light hexes that rendered #101828 body
 * text on the near-black dark background, i.e. invisible. Pointing them at the
 * theme variables lets inline styles resolve per theme like everything else.
 */
export const posTableColors = {
  primary: 'var(--primary)',
  primaryHover: 'var(--primary)',
  primaryMuted: 'var(--primary)',
  heading: 'var(--foreground)',
  text: 'var(--muted-foreground)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  rowBorder: 'var(--border)',
  headerBg: 'var(--muted)',
  hover: 'var(--muted)',
  white: 'var(--primary-foreground)'
} as const;
