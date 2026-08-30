/**
 * Pastel Campus color system — stable pastel identities for entities.
 *
 * Complements the `pastel-campus` theme: every course, tab, and status maps
 * to one of six candy slots. The same seed always lands on the same slot, so
 * a course keeps its color across the grid, header, and calendar.
 *
 * All values are full Tailwind class strings (never computed at runtime) so
 * the JIT compiler sees them statically. Each slot pairs a soft fill with a
 * dark same-family text color for contrast, plus dark-mode variants.
 */

export interface PastelSlot {
  /** Soft fill + dark text — for tiles, chips, and badges. */
  chip: string;
  /** Fill only — for large tiles where content sets its own text color. */
  tile: string;
  /** Dark same-family text (use on `tile` backgrounds). */
  text: string;
  /** Muted same-family text for secondary lines on `tile` backgrounds. */
  subtext: string;
  /** Saturated solid — progress bars, rings, active accents. */
  solid: string;
}

export const PASTEL_SLOTS: readonly PastelSlot[] = [
  {
    // violet
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    tile: 'bg-violet-100 dark:bg-violet-500/20',
    text: 'text-violet-900 dark:text-violet-200',
    subtext: 'text-violet-700/80 dark:text-violet-300/80',
    solid: 'bg-violet-500'
  },
  {
    // sky
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    tile: 'bg-sky-100 dark:bg-sky-500/20',
    text: 'text-sky-900 dark:text-sky-200',
    subtext: 'text-sky-700/80 dark:text-sky-300/80',
    solid: 'bg-sky-500'
  },
  {
    // emerald (mint)
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    tile: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-900 dark:text-emerald-200',
    subtext: 'text-emerald-700/80 dark:text-emerald-300/80',
    solid: 'bg-emerald-500'
  },
  {
    // amber (peach)
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    tile: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-900 dark:text-amber-200',
    subtext: 'text-amber-700/80 dark:text-amber-300/80',
    solid: 'bg-amber-500'
  },
  {
    // pink
    chip: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
    tile: 'bg-pink-100 dark:bg-pink-500/20',
    text: 'text-pink-900 dark:text-pink-200',
    subtext: 'text-pink-700/80 dark:text-pink-300/80',
    solid: 'bg-pink-500'
  },
  {
    // teal
    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
    tile: 'bg-teal-100 dark:bg-teal-500/20',
    text: 'text-teal-900 dark:text-teal-200',
    subtext: 'text-teal-700/80 dark:text-teal-300/80',
    solid: 'bg-teal-500'
  }
];

/** Stable 32-bit string hash (same shape as the discussions avatar util). */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** The pastel slot for an entity — same seed, same color, everywhere. */
export function pastelFor(seed: string): PastelSlot {
  const key = seed.trim() || '?';
  return PASTEL_SLOTS[hashString(key) % PASTEL_SLOTS.length];
}

/**
 * Fixed hues for the course-page tabs so the navigation itself becomes the
 * color legend: feed=sky, chat=violet, assignments=amber, quizzes=emerald,
 * and so on. Falls back to violet for unknown ids.
 */
const TAB_SLOT_INDEX: Record<string, number> = {
  overview: 0, // violet
  feed: 1, // sky
  chat: 0, // violet
  assignments: 3, // amber
  quizzes: 2, // emerald
  resources: 5, // teal
  groups: 1, // sky
  roster: 5, // teal
  grades: 4, // pink
};

export function pastelForTab(tabId: string): PastelSlot {
  return PASTEL_SLOTS[TAB_SLOT_INDEX[tabId] ?? 0];
}
