# UI/UX Consistency Audit — campus-connect frontend
_Generated 2026-05-27_

## Top-line verdict
The dashboard ships three competing visual languages: a shadcn-tokenised system (`PageContainer` + `Heading` + `EmptyState`), a hand-rolled "slate / pastel" overview/auth/course-card system (raw `text-slate-*`, `bg-blue-50`, fixed white backgrounds that ignore dark mode), and a course-details "segmented buttons" system that re-implements `Tabs` from scratch with subtly different rounding/padding each time. The single biggest problem is that core surfaces — `profile-view-page.tsx`, `users-list.tsx`, `dean-user-management.tsx`, `course-details/components/empty-state.tsx` — bypass `PageContainer`, `EmptyState`, `Table`, and `Tabs`, so dark-mode parity, header alignment, and skeleton fidelity are inconsistent. Two `EmptyState` components with the same name but different APIs exist side-by-side in the same folder, which is the kind of duplication that guarantees future drift. The wins available are large because the shadcn primitives already exist — most fixes are deletions and one-import swaps, not new design work.

## Severity summary
- 🔴 14 high
- 🟡 18 medium
- 🟢 9 low

## Findings by category

### 1. Page headers
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/profile/components/profile-view-page.tsx:69-70 | Raw `<div className='p-4 space-y-6'><h2 className='text-3xl font-bold tracking-tight'>` instead of `PageContainer` props — duplicates `Heading` markup by hand |
| 🔴 | features/users/components/dean-user-management.tsx:71-85 | Raw `<h1 className='text-3xl font-bold tracking-tight'>` + manual header row; not wrapped in `PageContainer` |
| 🔴 | features/overview/components/admin-dashboard.tsx:67, student-dashboard.tsx:112, teacher-dashboard.tsx:124 | All three dashboards use `<h2 className='text-3xl font-bold tracking-tight mb-2 text-slate-800'>` — explicit slate colour breaks dark mode, ignores `Heading` |
| 🟡 | features/course-details/components/course-quizzes.tsx:934 vs course-attendance.tsx:174 vs course-assignments.tsx:1080 vs quiz-builder.tsx:334 vs attempt-review.tsx:104 | Sub-page titles use 4 different sizes: `text-2xl font-bold`, `text-xl font-bold`, `text-xl font-bold`, `text-xl font-bold`, `text-lg font-bold` — no consistent "view header" scale |
| 🟡 | components/layout/page-container.tsx:63 vs ui/heading.tsx:14 | `Heading` renders `text-3xl` but `PageSkeleton` (line 11) renders an `h-8` placeholder — skeleton is undersized for the real heading |
| 🟢 | features/overview/components/overview.tsx:24 | `text-2xl font-bold tracking-tight` — divergent from the `text-3xl` `Heading` baseline |

### 2. Buttons
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/users/components/users-list.tsx:82 | "Delete" rendered as `<Button variant='ghost' className='text-red-500 hover:text-red-700 hover:bg-red-50'>` instead of `variant='destructive'` (or destructive-ghost) — same action coded differently in `course-attendance.tsx:167` (`className='text-destructive'`) |
| 🔴 | features/announcements/components/empty.tsx:56 | `<Button variant='outline' className='h-10 rounded-full px-5'>` — full-pill button is unique to this one empty state |
| 🟡 | features/teacher-courses/components/teacher-course-card.tsx:57, 73, 81, 92 | Multiple buttons with `bg-blue-50 text-blue-600 ... border-none` / `bg-white border-slate-200 text-slate-600 rounded-lg` — hand-rolled instead of `Button variant='secondary'`/`'outline'` |
| 🟡 | features/users/components/users-list.tsx:104 | `<Button variant='outline' size='sm' className='text-xs h-7'>` — overrides the size primitive with a smaller height |
| 🟡 | features/course-details/components/course-attendance.tsx:245 + 161 | "Scan attendance" uses default primary; "Back" uses `variant='ghost'`; "Delete session" uses ghost+`text-destructive` — three different button "tones" appear in the same view |
| 🟢 | 56 distinct `<Button variant=` callsites across 30 files | Variant usage itself is fine; the problem is custom `className` overrides, not the variants |

### 3. Filter pills / tab bars
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | course-details/components/course-quizzes.tsx:2081 (`rounded-lg`) vs 2122 (`rounded-md`) | Two segmented controls in the **same file** use different border-radius |
| 🔴 | course-details/components/course-assignments.tsx:1204, 1229, 1596 + course-quizzes.tsx:2081, 2122 | Five hand-rolled `<div className='inline-flex rounded-* border bg-card p-0.5 text-xs'>` segmented controls with button children instead of `Tabs`/`ToggleGroup` — duplicated keyboard handling, no aria-tablist semantics |
| 🔴 | announcements/components/announcement-feed.tsx:69 | A 6th segmented control variant: `rounded-full border-border bg-muted/50 p-0.5 shadow-xs` with `min-h-[44px]` pills — totally different geometry from the course-details ones |
| 🟡 | discussions/components/details/details-panel.tsx:255 vs notifications-panel.tsx:248 | Real shadcn `Tabs` is used but reformatted twice: `h-12 rounded-none border-0 bg-transparent p-0` and `h-9 rounded-none border-b bg-transparent p-0` — same intent (underline tabs), different sizes |
| 🟡 | users/components/dean-user-management.tsx:100 | `TabsList className='grid w-full max-w-[400px] grid-cols-2'` — bespoke width vs default sizing elsewhere |

### 4. Cards
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/course-details/components/empty-state.tsx:11 | `rounded-3xl bg-slate-50/50 border-slate-200` — fixed slate, ignores theme, ignores dark mode |
| 🔴 | features/course-details/components/_shared/empty-state.tsx:25 | The "good" empty state uses `rounded-lg` — the two coexisting `EmptyState` components disagree on radius and palette |
| 🟡 | course-details/components/course-attendance.tsx:185 (`rounded-lg`) vs course-attendance.tsx:254 (`rounded-lg p-3`) vs course-chat.tsx:253 (`rounded-lg h-[400px]`) | Card-like containers in same feature use `border rounded-lg` directly instead of `<Card>` primitive |
| 🟡 | users/components/users-list.tsx:43 (`rounded-xl`) vs dean-user-management.tsx:140 (`rounded-md`) | Same "table card" pattern uses two different radii in adjacent files |
| 🟡 | 441 hits of `rounded-*` across 119 files; ~30 hand-rolled bordered containers per course-details feature | No single "panel" component — every author picks `border rounded-{lg,md,xl}` ad hoc |
| 🟢 | course-details/components/course-attendance.tsx:240, 285, 291, 297 | Same `<Card><CardContent className='p-4'>` repeated 4 times for KPI tiles — works, but ripe for extraction |

### 5. Empty states
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/course-details/components/empty-state.tsx (whole file) | Duplicate `EmptyState` export living next to `_shared/empty-state.tsx`; no callers — dead code that risks accidental import |
| 🔴 | features/users/components/users-list.tsx:92 | `<td colSpan={4} className='text-center py-16 text-muted-foreground italic'>No users found...</td>` — ad-hoc |
| 🔴 | features/users/components/dean-user-management.tsx:218 | `<div className='text-center py-8 text-muted-foreground italic text-sm'>All students are assigned.</div>` — ad-hoc |
| 🔴 | features/announcements/components/empty.tsx:36-62 | Bespoke gradient-glow empty state with `motion.div`, `rounded-3xl`, gradient backdrop and `size-16` icon — visually unrelated to `_shared/EmptyState` |
| 🟡 | features/chat/components/conversation-list.tsx:76, 126 | `<p className='text-muted-foreground py-8 text-center text-xs'>No conversations found</p>` — plain text |
| 🟡 | features/discussions/components/dms/dm-message-list.tsx:218 | Custom `<p className='text-sm font-medium'>No messages yet</p>` |
| 🟡 | features/discussions/components/channel/manage/permissions-tab.tsx:471 | A *third* local `EmptyState` component defined inline |
| 🟢 | course-details/components/course-feed.tsx:445, course-assignments.tsx:907/1840, course-groups.tsx:141, course-roster.tsx:134, course-quizzes.tsx:1524/1735/2644, course-resources.tsx:373 | Good — these all use the shared `_shared/empty-state.tsx` |

### 6. Loading states
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/users/components/dean-user-management.tsx:154, 255 | `<td colSpan={4} className='p-8 text-center animate-pulse'>Loading...</td>` — plain text spinner-less |
| 🔴 | features/users/components/users-list.tsx:31 | `<div className='p-8 text-center text-muted-foreground animate-pulse'>Loading users...</div>` |
| 🔴 | course-details/components/course-chat.tsx:253 | `<div className='border rounded-lg h-[400px] flex items-center justify-center'>Loading...</div>` |
| 🟡 | course-details/components/course-assignments.tsx:1263, course-attendance.tsx:183, add-from-bank-dialog.tsx:255 | `<p className='text-sm text-muted-foreground'>Loading…</p>` — three callsites with the ellipsis variant |
| 🟡 | discussions/components/notifications/notifications-panel.tsx:171, 310 + dm-create-dialog.tsx:162 | Plain "Loading…" text in three sibling components |
| 🟡 | components/layout/page-container.tsx:8-17 | The page-level `PageSkeleton` uses raw `bg-muted` divs (no `Skeleton` primitive), inconsistent with `_shared/ListSkeleton` which uses `<Skeleton>` |
| 🟢 | course-details/components/_shared/list-skeleton.tsx | Good — comprehensive variant API, but only used in course-details |

### 7. Colour palette drift
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/profile/components/profile-view-page.tsx:41-46 | Hard-coded role palette `bg-blue-100 text-blue-800 / bg-green-100 / bg-purple-100 / bg-red-100` with **no dark mode** — same Role concept is coloured differently in `users-list.tsx:19-24` (`bg-blue-50 text-blue-600`) |
| 🔴 | features/users/components/users-list.tsx:19-24 | Second source of truth for role colours: STUDENT=green here, no dark variants |
| 🔴 | course-details/components/course-attendance.tsx:292 (`text-emerald-600`) vs course-quizzes.tsx:1112 (`text-emerald-900` for correct answers) vs attempt-review.tsx (Award/CheckCircle2 with emerald-ish via Badge) | "Success" tone — emerald in three different shades, plus `Badge variant='default'` |
| 🔴 | course-details/components/course-attendance.tsx:298 (`text-blue-600 dark:text-blue-400` for student count) vs admin-dashboard / teacher-dashboard (slate / blue mixed) | "Info / count" uses both blue and slate inconsistently |
| 🔴 | course-details/components/course-quizzes.tsx:828, 887, 957, 1105, 1261 + many | Pervasive `text-amber-*` / `bg-amber-*` warning palette literal — should be tokens (e.g. `bg-warning/10 text-warning`) |
| 🟡 | features/overview/components/* | `text-slate-800`, `text-slate-500`, `bg-slate-100` hard-coded throughout — explicitly bypasses the theme |
| 🟡 | features/teacher-courses/components/teacher-course-card.tsx:57 | `bg-blue-50 text-blue-600` "category" badge — same data category renders differently than the equivalent in `course-overview.tsx:159` (`Badge variant='outline' text-[10px] uppercase`) |
| 🟡 | 112 colour-token-bypass hits across 30 files (text-*) + 67 hits (bg-*) | Palette drift is system-wide, not isolated |

### 8. Spacing scale
| Sev | File:line | Finding |
|---|---|---|
| 🟡 | course-details: `space-y-2` (118 hits) / `space-y-3` / `space-y-4` / `space-y-6` mixed | No semantic rule — `course-attendance.tsx` mixes `space-y-4` (line 237) and `space-y-2` (252) within the same student view |
| 🟡 | course-details/components/empty-state.tsx (`p-12`) vs _shared/empty-state.tsx (`p-10`) vs announcements/empty.tsx (`py-20`) | Three different vertical paddings for the "empty" concept |
| 🟡 | 113 hits of `p-3` / `p-4` / `p-6` / `p-8` in course-details — `course-assignments.tsx` uses `p-3` for table cells, `p-4` for cards, `p-6` for nothing here, inconsistent with `course-attendance.tsx` which uses `p-4` for KPI cards | Padding picked per-component, not via tokens |
| 🟢 | `gap-2` and `gap-1` are used consistently for inline icon-text rows | Good baseline |

### 9. Modal / Dialog patterns
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | course-details/components/course-quizzes.tsx:1326, 1357 use `Dialog`; lines 896, 1197, 1253 use `AlertDialog` | Confirmation flows (submit quiz at 1253) correctly use AlertDialog; auto-close terminal (1357) uses plain `Dialog` despite being non-dismissable — inconsistent rule |
| 🟡 | course-details/components/course-assignments.tsx:1380 `Sheet` (drawer) vs 1739/1790/2080/2146 `Dialog` | Sheet used for the submission drawer, Dialog for grade/bulk/create — but the create dialog at line 2080 has `max-w-md` while assignment edit at 2146 also `max-w-md`; bulk grade also `max-w-md` — sizing is consistent here, but `ai-generate-dialog.tsx:240` jumps to `max-w-3xl` and `add-from-bank-dialog.tsx:134` to `max-w-4xl` with no documented rule |
| 🟡 | dialog widths inventory | `sm:max-w-md`, `max-w-sm`, `max-w-md`, `max-w-3xl`, `max-w-4xl`, `sm:max-w-md` (forms), `sm:max-w-lg` (sheets), `sm:max-w-4xl` (drawers) — 6 distinct widths, no naming convention |
| 🟢 | users/user-form-sheet.tsx + announcement-analytics-sheet.tsx + course-assignments submission drawer | Good — all use `Sheet side='right'` for "secondary surface" pattern |

### 10. Badges
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | course-details/components/course-quizzes.tsx:2853 | `<Badge variant='outline' className='text-[10px] text-amber-700 dark:text-amber-400 border-amber-300/50'>` — overrides outline variant with full custom palette |
| 🔴 | overview/components/teacher-dashboard.tsx:188, 410 | `<Badge variant='secondary' className='bg-slate-100 text-slate-600 border-0'>` and `<Badge className='bg-slate-800 text-white hover:bg-slate-900 ...'>` — bespoke "tag" treatment that bypasses variants entirely |
| 🟡 | course-details/components/course-quizzes.tsx ~20 callsites all use `className='text-[10px]'` on Badge | The default badge text size is overridden to `text-[10px]` everywhere — should be a new `size='xs'` variant on the primitive, not 20 className overrides |
| 🟡 | profile/components/profile-view-page.tsx:80 | Role rendered as `<span className='inline-flex items-center rounded-full px-3 py-1 text-xs ...'>` instead of `<Badge>` |
| 🟢 | features/users/components/users-table/columns.tsx:45-64 | Good — uses variants only |

### 11. Tables
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | features/users/components/users-list.tsx:44-98 | Raw `<table><thead><tbody>` with custom classes — does not use the `Table` primitive |
| 🔴 | features/users/components/dean-user-management.tsx:141-275 | Two raw `<table>` blocks (Students, Lecturers) — same |
| 🟡 | course-details/components/course-attendance.tsx:185 + course-details/components/_shared/simple-data-table.tsx | Both use the shadcn `Table` primitive — good — but `simple-data-table.tsx` re-implements sorting/filtering instead of using `useDataTable` available elsewhere in the project |
| 🟢 | announcement-analytics-sheet.tsx and course-quizzes/course-assignments table sections | Good — use shadcn `Table` |

### 12. Typography hierarchy
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | Inventory of distinct font-size classes seen: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[15px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-5xl` | 14 distinct sizes — more than 2× the recommended ceiling |
| 🔴 | overview/components/teacher-dashboard.tsx, student-dashboard.tsx | Heavy use of arbitrary `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]` for dashboards — these should collapse into `text-xs`/`text-sm` |
| 🟡 | clubs/components/club-role-badge.tsx:50 | `text-[9px]` micro-text — only place in codebase using 9px |
| 🟡 | announcements/components/announcement-content.tsx:128-134 | `text-lg`, `text-base`, `text-[15px]` for h1/h2/h3 — h3 is on a non-standard size |
| 🟢 | course-details/components/course-quizzes.tsx | Consistently sticks to `text-xs` / `text-sm` for body, `text-2xl font-bold` for hero number, `text-[10px]` for status pills — internally consistent at least |

### 13. Iconography
| Sev | File:line | Finding |
|---|---|---|
| 🔴 | 44+ files import directly from `lucide-react` despite CLAUDE.md saying "only import from `@/components/icons`" | Pervasive violation; examples: `course-details/components/course-quizzes.tsx:71`, `course-assignments.tsx:39`, `attempt-review.tsx:5`, `announcement-feed.tsx:4`, `users/components/user-form-sheet.tsx:7`, `student-courses/components/student-courses-grid.tsx:5` |
| 🔴 | features/course-details/components/empty-state.tsx:1 | Exports a component typed with `LucideIcon` directly (not via the icons barrel) |
| 🟡 | features/announcements/components/empty.tsx:3 + features/users/components/dean-user-management.tsx:82-83 | Use the canonical `Icons.*` pattern — good — but only some files do this; mixed within the same feature |
| 🟢 | No `@tabler/icons-react` direct imports found in features | Tabler imports are confined to `@/components/icons` as intended |

### 14. Form patterns
| Sev | File:line | Finding |
|---|---|---|
| 🟡 | Only 7 files use `useAppForm` (auth, course-details/create-assignment-form, faculties, departments, etc.) | Forms in `course-details/quiz-settings-form.tsx`, `module-form.tsx`, `resource-form.tsx`, `course-attendance.tsx` (inline create), `course-feed.tsx` (inline create), `course-groups.tsx` (create dialog), `course-resources.tsx` use raw `Input`/`Textarea`/`useState` instead of TanStack Form — bypasses validation pipeline |
| 🟡 | features/users/components/dean-user-management.tsx:90-95 | Search input uses raw `<Input>` + `useState` — fine for search, but the same pattern is used for create-edit dialogs further down without `useAppForm` |
| 🟢 | features/auth/components/user-auth-form.tsx + create-assignment-form.tsx + FacultyFormSheet.tsx + departments | Correctly use `useAppForm` + `useFormFields<T>()` per CLAUDE.md |

## Cross-cutting themes

1. **Two `EmptyState` components, two `Tabs` patterns, two table patterns.** Every duplication has a "good" version (`_shared/empty-state.tsx`, shadcn `Tabs`, shadcn `Table`) and an "ad-hoc" version (`empty-state.tsx`, hand-rolled `inline-flex rounded-* border` segmented buttons, raw `<table>`). The ad-hoc versions exist because the shadcn ones don't quite fit some niche need — but the niches are inconsistent with each other.
2. **`text-slate-*` / `bg-blue-50` / `bg-amber-50` literal palette in 30+ files.** Dashboards, course cards, profile and users-list are not theme-aware. Dark mode is silently broken on those surfaces.
3. **`className` overrides defeat shadcn variants.** Buttons, Badges and Tabs use the right primitives but immediately override `bg-*`, `text-*`, `h-*`, `rounded-*` — re-introducing the inconsistency the variants were supposed to prevent.
4. **Arbitrary pixel sizes (`text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]`).** The dashboards alone introduce 4 non-Tailwind text sizes for ornamentation; together with feature-specific micro-typography it adds up to 14 distinct sizes.
5. **CLAUDE.md conventions are not enforced.** `Heading` is documented as off-limits, `lucide-react` imports are documented as off-limits, `PageContainer` is documented as the only header path — three documented rules, three pervasive violations.

## Recommended fix order

1. **Delete `features/course-details/components/empty-state.tsx`.** Confirm no imports (grep shows none) and remove the slate-coloured duplicate. _Touches: 1 file._
2. **Migrate `users-list.tsx`, `dean-user-management.tsx`, and `profile-view-page.tsx` to `PageContainer`** with `pageTitle` / `pageDescription` / `pageHeaderAction`. Removes 3 hand-rolled `<h1 text-3xl font-bold tracking-tight>` headers and brings them into the same sticky-header geometry as the rest of the dashboard. _Touches: 3 files._
3. **Replace `lucide-react` direct imports with `@/components/icons` barrel imports across the 44 violating files.** Mechanical refactor; restores CLAUDE.md compliance and centralises icon swaps. _Touches: ~44 files._
4. **Extract the 5 hand-rolled segmented controls in `course-quizzes.tsx` (2081, 2122) and `course-assignments.tsx` (1204, 1229, 1596) into a single `<SegmentedControl>` primitive** (or adopt shadcn `ToggleGroup` with a thin wrapper). Pick `rounded-md` to match the assignments side. _Touches: 2 files now; primitive enables future use._
5. **Replace ad-hoc role palettes in `profile-view-page.tsx:41-46` and `users-list.tsx:19-24` with a single `roleBadgeVariant(role)` helper** that returns shadcn `Badge` variants (or a small set of theme-token classes). Eliminates dark-mode breakage on two surfaces. _Touches: 2 files + 1 helper._
6. **Standardise loading states: replace raw "Loading…" / "Loading..." strings with `<ListSkeleton variant='card'>` or `<ListSkeleton variant='row'>`.** Worst offenders: `dean-user-management.tsx:154, 255`; `users-list.tsx:31`; `course-chat.tsx:253`; `add-from-bank-dialog.tsx:255`; `notifications-panel.tsx:171, 310`; `dm-create-dialog.tsx:162`. _Touches: ~8 files._
7. **Convert raw `<table>` blocks in `users-list.tsx` and `dean-user-management.tsx` to the shadcn `Table` primitive.** Both have 3 column layouts already mappable directly. _Touches: 2 files._
8. **Replace `text-amber-*` warning palette with a `warning` design token.** Add `--warning` and `--warning-foreground` to `theme.css` and update the 20+ amber callsites in `course-quizzes.tsx`. Same for the "success" emerald variants. _Touches: theme.css + ~6 course-details files._
9. **Add `size='xs'` to `Badge` primitive** (`text-[10px] px-1.5 h-4`) and delete the ~25 `className='text-[10px]'` overrides in `course-quizzes.tsx` and `course-feed.tsx`. _Touches: badge.tsx + 4 files._
10. **Migrate `course-details` inline-create dialogs (`course-feed.tsx` create at 573, `course-groups.tsx` create at 253, `course-attendance.tsx` create at 435, `course-resources.tsx` resource-form) to `useAppForm`.** Removes the largest cluster of forms still bypassing the TanStack Form pipeline. _Touches: 4 files._

## What's already good
- `components/ui/` is a clean and complete shadcn surface — `Tabs`, `Table`, `Card`, `Dialog`, `AlertDialog`, `Sheet`, `Badge`, `Button`, `Skeleton`, plus a custom `tanstack-form` integration are all in place. The infra is solid; the audit is about discipline.
- `_shared/empty-state.tsx` and `_shared/list-skeleton.tsx` are well-designed, well-commented, and adopted across most course-details tabs (8+ callsites for EmptyState, growing ListSkeleton use).
- `PageContainer` + `Heading` + `Infobar` is a clean header system; pages that opt in (announcements, kanban, notifications, all the `app/dashboard/*` route files) look identical.
- Form patterns where adopted (`useAppForm` + `useFormFields<T>()` in faculty, department, assignment, auth forms) are consistent and elegant.
- Sheets for "secondary surface" (analytics, user edit, assignment review drawer) are uniformly `side='right'` with sensible widths.
- Discussions feature shows good restraint with shadcn `Tabs`/`Sheet`/`Dialog` and is one of the more visually consistent areas.
- The `@/components/icons` barrel exists and is used correctly by `announcements/components/empty.tsx` and the route-level pages — the pattern works when followed.
