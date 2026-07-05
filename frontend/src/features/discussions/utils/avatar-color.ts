/**
 * Deterministic avatar colors for discussion participants.
 *
 * Each person maps to a stable gradient derived from their name, so the same
 * user always renders the same color across channels, threads and DMs — the
 * "give the chat life" touch you see in Slack / Discord. Colors are drawn from
 * the campus-connect palette (primary blue, secondary green) plus a handful of
 * complementary hues so a busy channel stays readable and colorful.
 */

type GradientStops = readonly [string, string];

// 135° gradients (top-left → bottom-right). First two anchor on the brand
// palette; the rest are complementary hues tuned to sit well next to them.
const AVATAR_PALETTE: readonly GradientStops[] = [
  ['#0468CE', '#3B82F6'], // brand blue
  ['#0C8806', '#22C55E'], // brand green
  ['#7C3AED', '#A78BFA'], // violet
  ['#F59E0B', '#FBBF24'], // amber
  ['#EC4899', '#F472B6'], // pink
  ['#0D9488', '#2DD4BF'], // teal
  ['#E11D48', '#FB7185'], // rose
  ['#4F46E5', '#818CF8'], // indigo
  ['#0891B2', '#22D3EE'], // cyan
  ['#CA8A04', '#EAB308'] // gold
];

// Neutral slate gradient for anonymous senders — intentionally desaturated so
// "Anonymous" never gets mistaken for a real person's color identity.
const ANONYMOUS_GRADIENT: GradientStops = ['#64748B', '#94A3B8'];

/** Stable 32-bit string hash (djb2-ish). Same input → same index. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

function stopsFor(name: string, isAnonymous = false): GradientStops {
  if (isAnonymous) return ANONYMOUS_GRADIENT;
  const key = name.trim() || '?';
  return AVATAR_PALETTE[hashString(key) % AVATAR_PALETTE.length];
}

/**
 * CSS `background` value (a 135° linear gradient) for a participant avatar.
 * Pair with white foreground text for contrast.
 */
export function avatarGradient(name: string, isAnonymous = false): string {
  const [from, to] = stopsFor(name, isAnonymous);
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/**
 * Solid color (the gradient's start stop) for the same participant — handy for
 * small accents like presence rings or mention chips where a flat color reads
 * better than a gradient.
 */
export function avatarSolid(name: string, isAnonymous = false): string {
  return stopsFor(name, isAnonymous)[0];
}
