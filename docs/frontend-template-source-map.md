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
