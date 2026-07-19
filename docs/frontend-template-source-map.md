# Frontend Template Source Map

Reference map for the DreamsPOS → Campus Connect UI migration.

**Foundation:** keep `frontend/` (Next.js 16, Tailwind v4, shadcn/ui, existing cookie JWT + CSRF auth).

**Staging (read-only, gitignored):** `_vendor/dreamspos/`

**Do not import:** Bootstrap, Ant Design, jQuery, `react-bootstrap`, DreamsPOS auth context, or global DreamsPOS SCSS/JS bundles into Campus Connect.

---

## Strategy overview

| Campus Connect Area | Visual Source | Technical Strategy |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| Login | Laundry Next.js | Port UI into existing `/auth/sign-in`; preserve Campus Connect auth |
| Header | Pharmacy HTML | Recreate visual design using existing shadcn/Tailwind components |
| Sidebar | Pharmacy HTML | Recreate appearance using existing `app-sidebar` architecture |
| Dashboard | Pharmacy HTML | Rebuild cards/layout with current Recharts and shared UI |
| Settings | Pharmacy HTML | Rebuild visual structure using current form components |
| List pages | Pharmacy categories/medicines | Extract design pattern, not Bootstrap implementation |
| Add/Edit forms | Pharmacy forms | Recreate using TanStack Form and existing fields |
| Chat | Retail Next.js | Compare visual design with existing discussions system; do not overwrite existing chat |

---

## Detailed source → destination map

### Login

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/laundry-next/nextjs/template/src/app/(authentication)/login/page.tsx` |
| | `_vendor/dreamspos/laundry-next/nextjs/template/src/app/(authentication)/login/loginClient.tsx` |
| | `_vendor/dreamspos/laundry-next/nextjs/template/src/app/(authentication)/layout.tsx` |
| | `_vendor/dreamspos/laundry-next/nextjs/template/public/assets/img/authentication/login.png` |
| | `_vendor/dreamspos/laundry-next/nextjs/template/src/style/scss/pages/_authentication.scss` |
| **Destination** | `frontend/src/app/auth/sign-in/page.tsx` |
| | `frontend/src/features/auth/components/sign-in-view.tsx` |
| | `frontend/src/features/auth/components/sign-in-form.tsx` |
| | `frontend/src/features/auth/components/sign-in-brand-panel.tsx` |
| **Action** | Visually recreate / adapt (not copy wholesale) |
| **Must not import** | Laundry `auth-context`, Bootstrap, Ant Design, `js-cookie` session patterns |
| **Reuse** | `useAuthStore`, `apiClient`, CSRF/`credentials: 'include'`, existing auth pages |

### Header

| Field | Value |
| ----- | ----- |
| **Source** | Inline markup in `_vendor/dreamspos/pharmacy-html/html/index.html` (`navbar-header`, `header-item`) |
| | `_vendor/dreamspos/pharmacy-html/html/assets/scss/structure/_header.scss` |
| | Behavior cues: `_vendor/dreamspos/pharmacy-html/html/assets/js/script.js` |
| **Destination** | `frontend/src/components/layout/header.tsx` |
| **Action** | Visually recreate |
| **Must not import** | Bootstrap CSS/JS, jQuery, Pharmacy `script.js` |
| **Reuse** | Existing layout header, shadcn `Button`/`DropdownMenu`/`Input`, theme controls |

### Sidebar

| Field | Value |
| ----- | ----- |
| **Source** | Inline markup in Pharmacy HTML pages (`sidebar`, `sidebar-menu`) |
| | `_vendor/dreamspos/pharmacy-html/html/assets/scss/structure/_sidebar.scss` |
| **Destination** | `frontend/src/components/layout/app-sidebar.tsx` (+ related sidebar pieces under `components/layout/`) |
| **Action** | Visually recreate |
| **Must not import** | Bootstrap nav plugins, duplicated HTML sidebar blocks |
| **Reuse** | `app-sidebar`, `nav-config.ts`, `useFilteredNavItems`, `Icons` |

### Dashboard

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/pharmacy-html/html/index.html` |
| | Chart plugins under `html/assets/plugins/apexchart/` (reference only) |
| **Destination** | `frontend/src/app/dashboard/` overview routes |
| | `frontend/src/features/overview/` |
| **Action** | Visually recreate |
| **Must not import** | ApexCharts Pharmacy bundles, Bootstrap cards as-is |
| **Reuse** | Recharts, `PageContainer`, existing overview KPI/chart components |

### Settings

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/pharmacy-html/html/*-settings.html` (e.g. `business-settings.html`, `profile-settings.html`, `roles-settings.html`, `user-settings.html`, …) |
| **Destination** | Future settings routes under `frontend/src/app/dashboard/` + feature modules (TBD per Setup Module plan) |
| **Action** | Visually recreate |
| **Must not import** | Bootstrap forms, Pharmacy HTML pages |
| **Reuse** | TanStack Form (`useAppForm`), shadcn form fields, existing profile patterns |

### List pages (categories / medicines)

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/pharmacy-html/html/categories.html` |
| | `_vendor/dreamspos/pharmacy-html/html/medicines.html` |
| **Patterns to study** | Search, date picker, Sort By, Columns, Export dropdown, table toolbar |
| **Destination** | Feature list pages using `frontend/src/components/ui/table/` + `use-data-table` |
| **Action** | Extract design pattern; visually recreate |
| **Must not import** | DataTables/jQuery, Bootstrap dropdown toolbars as global assets |
| **Reuse** | TanStack Table, nuqs URL state, shadcn `DropdownMenu`/`Popover`/`Calendar` |

### Add / Edit forms

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/pharmacy-html/html/add-medicines.html` |
| | `_vendor/dreamspos/pharmacy-html/html/edit-medicines.html` |
| **Destination** | Feature form components under `frontend/src/features/<module>/` |
| **Action** | Visually recreate |
| **Must not import** | Bootstrap form markup, Select2/jQuery widgets |
| **Reuse** | TanStack Form + Zod, existing field wrappers in `components/ui/tanstack-form` |

### Chat

| Field | Value |
| ----- | ----- |
| **Source** | `_vendor/dreamspos/retail-next/src/app/(features)/(application)/chat/page.tsx` |
| | `_vendor/dreamspos/retail-next/src/components/application/chat.tsx` |
| | `_vendor/dreamspos/retail-next/src/style/scss/pages/_chat.scss` |
| | Assets: `retail-next/public/assets/img/icons/smile-chat.svg`, `…/priority/dreamchat.svg` |
| | Note: mock conversation UI is inline in `chat.tsx` (no separate chat JSON extracted) |
| **Destination** | Compare only against `frontend/src/features/discussions/` and `frontend/src/app/dashboard/chat/` |
| **Action** | Visual comparison / optional adaptation later — **do not overwrite** existing chat |
| **Must not import** | `react-perfect-scrollbar`, `react-feather`, Bootstrap chat layout, Retail footer/tooltip deps |
| **Reuse** | Existing discussions sockets, composers, sidebars, message lists |

---

## Staging layout

```text
_vendor/dreamspos/
├── laundry-next/     ← from laundry-pos/nextjs.zip (full)
│   └── nextjs/template/...
├── pharmacy-html/    ← from pharmacy-pos/html.zip (full)
│   └── html/...
└── retail-next/      ← partial extract from retail-pos/nextjs.zip (chat-focused)
    ├── package.json  (reference only — do not npm/bun install)
    ├── public/...
    └── src/...
```

## Zip origins

| Staging folder | Archive |
| -------------- | ------- |
| `laundry-next` | `themeforest-…/dreamspos-v2.2.9/laundry-pos/nextjs.zip` |
| `pharmacy-html` | `themeforest-…/dreamspos-v2.2.9/pharmacy-pos/html.zip` |
| `retail-next` | `themeforest-…/dreamspos-v2.2.9/retail-pos/nextjs.zip` (partial) |

## Git ignore

ThemeForest payload and `_vendor/` are ignored via root `.gitignore` so they cannot be committed accidentally.

---

## Frontend Technology and Migration Rules

### Locked production stack (`frontend/`)

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| Framework | **Next.js 16.2.1** (App Router under `src/app/`) | Do not change version for this migration |
| UI runtime | **React 19.2.4** | Server Components by default; `'use client'` only when needed |
| Language | **TypeScript 5.7.2** (`strict: true`) | New files must be `.ts` / `.tsx`; aliases `@/*`, `@shared/*` |
| Styling | **Tailwind CSS v4.2.2** via `@import 'tailwindcss'` in `src/styles/globals.css` | Theme tokens in `theme.css` + `styles/themes/` |
| Components | **shadcn/ui** (New York) + **Radix UI** | Config: `frontend/components.json` |
| Forms / tables | **TanStack Form**, **TanStack Table**, **Zod** | Prefer existing field wrappers |
| Client state | **Zustand** | Includes `useAuthStore` |
| Charts / motion | **Recharts**, **Framer Motion** | Prefer these over DreamsPOS Apex/Bootstrap charts |
| Realtime | **Socket.IO client** | Existing discussions / course chat |
| Package manager | **Bun** (official for frontend commands) | See dual-lockfile risk below |

**Not allowed in production frontend:** Bootstrap, jQuery, Ant Design, DreamsPOS global CSS/JS, or a second frontend app architecture.

### Dual-lockfile risk

`frontend/` contains both `bun.lock` (preferred) and `package-lock.json`. Root scripts also use npm (`npm run … --prefix frontend`). Prefer **Bun** for all future frontend install/dev/build/lint/typecheck commands (`bun install`, `bun run typecheck`, `bun run lint`, `bun run build`). Do not delete either lockfile in the migration without an explicit follow-up; mixing `npm install` and `bun install` can drift dependency trees.

### Migration rules (enforce)

1. The current `frontend/` remains the **production** frontend.
2. DreamsPOS under `_vendor/dreamspos/` is a **visual reference** only.
3. Laundry Login UI may be **adapted** into the existing Campus Connect login route (`/auth/sign-in`); keep cookie JWT + CSRF auth.
4. Pharmacy HTML must be **visually recreated** using Tailwind and TypeScript.
5. Pharmacy **Bootstrap classes must not** be copied directly.
6. Pharmacy **jQuery scripts must not** be imported.
7. Pharmacy **global CSS and JavaScript must not** be added to Campus Connect.
8. Retail Chat must **not replace** the existing Campus Connect chat / discussions architecture.
9. Existing authentication, API client, CSRF handling, RBAC, routing, and state management must be **preserved**.
10. All new frontend components must use **TypeScript** (`.ts` / `.tsx`).
11. All new styling must use **Tailwind CSS** and existing theme tokens.
12. Existing **shadcn** components should be reused before custom components are created.

### Verification scripts (frontend)

```bash
bun run typecheck   # tsc --noEmit
bun run lint        # oxlint
bun run build       # next build
```

If Bun is unavailable on a machine, use `npm run typecheck|lint|build` in `frontend/` as a temporary fallback, then realign with Bun before merge.
