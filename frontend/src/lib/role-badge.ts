/**
 * Single source of truth for how roles are visually represented as badges.
 *
 * Before this helper existed, `profile-view-page.tsx` and `users-list.tsx`
 * each defined their own role → colour map — STUDENT was blue in one place,
 * green in the other; neither had dark-mode variants. The UI audit flagged
 * the divergence as the worst dark-mode regression on the platform.
 *
 * Both files now route through `roleBadgeVariant()` so:
 *   • the colour for "TEACHER" is the same everywhere it renders
 *   • the values are theme tokens (`bg-warning-muted`, etc.) that respect
 *     light AND dark mode automatically
 *   • adding a new role (or re-skinning the existing four) is one edit
 *
 * The function returns the shadcn Badge variant name when one fits cleanly;
 * for the cases where no single variant maps (e.g. SUPER_ADMIN deserves a
 * distinct purple tone), it returns 'outline' + a className override so the
 * Badge primitive still owns the radius / typography / focus ring.
 */

import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

/// Possible role strings handled by the helper. Lowercase fallback matches
/// the data sometimes returned by `/users/me` in older fixtures.
type Role =
  | 'SUPER_ADMIN'
  | 'DEAN'
  | 'TEACHER'
  | 'STUDENT'
  | (string & {});

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface RoleBadgeStyle {
  variant: BadgeVariant;
  /// Optional className override — used only when the variant alone isn't
  /// enough to convey the role (e.g. there's no purple variant on Badge).
  className?: string;
  /// User-facing label. Lets us swap "SUPER_ADMIN" for "Super Admin" without
  /// every callsite having to title-case manually.
  label: string;
}

export function roleBadgeVariant(role: Role | null | undefined): RoleBadgeStyle {
  const normalised = (role ?? '').toString().toUpperCase();
  switch (normalised) {
    case 'SUPER_ADMIN':
      // No 'purple' Badge variant — fall back to outline + token override.
      // `text-info` is close enough to purple under the project's palette
      // direction; if the design team wants a true purple, they can add a
      // 'royal' Badge variant later.
      return {
        variant: 'outline',
        className: 'border-info text-info bg-info-muted',
        label: 'Super Admin'
      };
    case 'DEAN':
      return { variant: 'info', label: 'Dean' };
    case 'TEACHER':
      return { variant: 'warning', label: 'Teacher' };
    case 'STUDENT':
      return { variant: 'success', label: 'Student' };
    default:
      return {
        variant: 'outline',
        // Last-resort: show the raw role string title-cased. Better than
        // crashing on a role the design didn't anticipate.
        label: normalised
          .toLowerCase()
          .split('_')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      };
  }
}
