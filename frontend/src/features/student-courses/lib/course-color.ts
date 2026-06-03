/**
 * Deterministic per-course identity colors — the dashboard's signature visual
 * device (à la Canvas / Google Classroom). The same course always maps to the
 * same hue, so a course reads consistently across its tile, its calendar dots,
 * and the timeline.
 *
 * These are an INTENTIONAL fixed identity palette, not theme tokens: they're
 * applied only as accents (progress ring, accent bar, code chip) on top of
 * token-driven surfaces (`bg-card`, `text-foreground`), so they stay legible in
 * every theme and in dark mode. OKLCH lightness is kept in a mid band (~0.62–
 * 0.76) so each hue works as an accent on both light and dark backgrounds.
 */
const COURSE_PALETTE = [
  'oklch(0.62 0.19 264)', // indigo
  'oklch(0.68 0.15 233)', // sky
  'oklch(0.70 0.15 162)', // emerald
  'oklch(0.76 0.16 70)', // amber
  'oklch(0.64 0.20 25)', // coral
  'oklch(0.62 0.20 305)', // violet
  'oklch(0.66 0.19 350)', // pink
  'oklch(0.70 0.13 195)' // teal
] as const;

function hash(input: string): number {
  // FNV-1a — stable across runs, good spread for short strings like course codes.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Solid identity color for a course (seed by course code for stability). */
export function courseColor(seed: string | number | null | undefined): string {
  const s = String(seed ?? '');
  return COURSE_PALETTE[hash(s) % COURSE_PALETTE.length];
}

/**
 * A translucent tint of the course color, for chip / surface backgrounds.
 * `pct` is the color's weight (0–100) mixed with transparent.
 */
export function courseTint(seed: string | number | null | undefined, pct = 14): string {
  return `color-mix(in oklab, ${courseColor(seed)} ${pct}%, transparent)`;
}
