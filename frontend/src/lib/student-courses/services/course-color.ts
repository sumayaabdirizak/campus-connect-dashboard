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
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function courseColor(seed: string | number | null | undefined): string {
  const s = String(seed ?? '');
  return COURSE_PALETTE[hash(s) % COURSE_PALETTE.length];
}

export function courseTint(seed: string | number | null | undefined, pct = 14): string {
  return `color-mix(in oklab, ${courseColor(seed)} ${pct}%, transparent)`;
}
