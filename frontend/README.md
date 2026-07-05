<h1 align="center">Admin Dashboard Template with Next.js &amp; Shadcn UI</h1>

<div align="center">Open source admin dashboard starter built with Next.js 16, shadcn/ui, Tailwind CSS, TypeScript</div>

<br />

<div align="center">
  <a href="https://dub.sh/shadcn-dashboard"><strong>View Demo</strong></a>
</div>
<br />
<div align="center">
  <img src="/public/shadcn-dashboard.png" alt="Shadcn Dashboard Cover" style="max-width: 100%; border-radius: 8px;" />
</div>

> **Campus Connect** — This is the Next.js frontend for the monorepo. See the [root README](../README.md) for full setup. Auth: [docs/auth.md](./docs/auth.md).

## Overview

This is an **open source admin dashboard starter** built with **Next.js 16, Shadcn UI, TypeScript, and Tailwind CSS**.

It gives you a production-ready **dashboard UI** with authentication, charts, tables, forms, and a feature-based folder structure, perfect for **SaaS apps, internal tools, and admin panels**.

### Tech Stack

This template uses the following stack:

- Framework - [Next.js 16](https://nextjs.org/16)
- Language - [TypeScript](https://www.typescriptlang.org)
- Auth - HttpOnly JWT cookies via Express backend (see [docs/auth.md](./docs/auth.md))
- Error tracking - [Sentry](https://sentry.io/for/nextjs/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy26q2-nextjs&utm_content=github-banner-project-tryfree)
- Styling - [Tailwind CSS v4](https://tailwindcss.com)
- Components - [Shadcn-ui](https://ui.shadcn.com)
- Charts - [Recharts](https://recharts.org) • [Evil Charts](https://evilcharts.com/)
- Schema Validations - [Zod](https://zod.dev)
- Data Fetching - [TanStack React Query](https://tanstack.com/query)
- State Management - [Zustand](https://zustand-demo.pmnd.rs)
- Search params state manager - [Nuqs](https://nuqs.47ng.com/)
- Tables - [Tanstack Data Tables](https://ui.shadcn.com/docs/components/data-table) • [Dice table](https://www.diceui.com/docs/components/data-table)
- Forms - [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev)
- Command+k interface - [kbar](https://kbar.vercel.app/)
- Linter / Formatter - [OxLint](https://oxc.rs/docs/guide/usage/linter) • [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- Pre-commit Hooks - [Husky](https://typicode.github.io/husky/)
- Themes - [tweakcn](https://tweakcn.com/)

_If you are looking for a Tanstack start dashboard template, here is the [repo](https://git.new/tanstack-start-dashboard)._

## Features

- 🧱 Pre-built **admin dashboard layout** (sidebar, header, content area)

- 📊 **Analytics overview** page with cards and charts

- 📋 **Data tables** with React Query prefetch, client-side cache, search, filter & pagination

- 🔐 **Authentication** via Express backend (cookie JWT + CSRF)

- 🔒 **Role-based navigation** — sidebar filtered by campus role (`STUDENT`, `TEACHER`, `DEAN`, etc.)

- 💬 **Discussions**, courses, quizzes, announcements, clubs, and calendar (see root README)

- ℹ️ **Infobar component** to show helpful tips, status messages, or contextual info on any page

- 🧩 **Shadcn UI components** with Tailwind CSS styling

- 🎨 **Multi-theme support** with 6+ beautiful themes and easy theme switching

- 🧠 Feature-based folder structure for scalable projects

- ⚙️ Ready for **SaaS dashboards**, internal tools, and client admin panels

## Use Cases

You can use this Next.js + Shadcn UI dashboard starter to build:

- SaaS admin dashboards

- Internal tools & operations panels

- Analytics dashboards

- Client project admin panels

- Boilerplate for new Next.js admin UI projects

## Pages (Campus Connect)

| Area | Route |
|------|--------|
| Sign in | `/auth/sign-in` |
| Role dashboard | `/dashboard` |
| Courses & quizzes | `/dashboard/courses/...` |
| Discussions | `/dashboard/discussions` |
| Announcements | `/dashboard/announcements` |
| Calendar | `/dashboard/calendar` |

Template demo routes (products, kanban demo, etc.) may still exist under `/dashboard` but are not part of the campus product surface.

## Feature based organization

```plaintext
src/
├── app/                           # Next.js App Router directory
│   ├── auth/                      # Sign-in pages
│   ├── dashboard/                 # Campus routes (courses, dean, discussions, …)
│   └── api/                       # Optional Next.js route handlers (mock routes removed)
│
├── components/                    # Shared components
│   ├── ui/                        # UI primitives (buttons, inputs, kanban, etc.)
│   ├── layout/                    # Layout components (header, sidebar, etc.)
│   ├── themes/                    # Theme system (selector, mode toggle, config)
│   └── kbar/                      # Command+K interface
│
├── features/                      # Feature-based modules
│   ├── overview/                  # Dashboard analytics (charts, cards)
│   ├── products/                  # Product listing, form, tables (React Query)
│   ├── users/                     # User management table (React Query)
│   ├── react-query-demo/          # React Query demo (Pokemon API)
│   ├── kanban/                    # Drag-drop task board
│   ├── chat/                      # Messaging (conversations, bubbles, composer)
│   ├── notifications/             # Notification center & store
│   ├── auth/                      # Auth components
│   └── profile/                   # Profile form schemas
│
├── lib/                           # Core utilities (query-client, searchparams, etc.)
├── hooks/                         # Custom hooks
├── config/                        # Navigation, infobar, data table config
├── constants/                     # Mock data
├── styles/                        # Global CSS & theme files
│   └── themes/                    # Individual theme CSS files
└── types/                         # TypeScript types
```

## Getting Started

> [!NOTE]  
> This admin dashboard starter uses **Next.js 16 (App Router)** with **React 19** and **Shadcn UI**. Follow these steps to run it locally:

Clone the repo:

```
git clone https://github.com/Kiranism/next-shadcn-dashboard-starter.git
```

- `bun install`
- Create a `.env.local` file by copying the example environment file:
  `cp env.example.txt .env.local`
- Add the required environment variables to the `.env.local` file.
- `bun run dev`

##### Environment Configuration Setup

To configure the environment for this project, refer to the `env.example.txt` file. This file contains the necessary environment variables required for authentication and error tracking.

##### Auth setup

See [docs/auth.md](./docs/auth.md) for cookie session flow and `NEXT_PUBLIC_API_URL`. Run the backend from `../backend` alongside this app.

You should now be able to access the application at http://localhost:3000.

> [!WARNING]
> After cloning or forking the repository, be cautious when pulling or syncing with the latest changes, as this may result in breaking conflicts.

---

#### Cleanup

To remove optional features you don't need (auth, kanban, chat, notifications, extra themes, sentry), run the cleanup script:

```bash
node scripts/cleanup.js --interactive   # interactive mode
node scripts/cleanup.js --list          # see available features
node scripts/cleanup.js --dry-run chat  # preview before removing
node scripts/cleanup.js kanban chat     # remove specific features
```

Run `node scripts/cleanup.js --help` for all options. Delete `scripts/cleanup.js` when you're done.

## Deploy

This project includes production-ready Dockerfiles (`Dockerfile` for Node.js, `Dockerfile.bun` for Bun) using standalone output mode. For all deployment options, see the [Next.js Deployment Documentation](https://nextjs.org/docs/app/getting-started/deploying).

### Docker

**Build the image:**

```bash
# Node.js
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api \
  -t campus-connect-frontend .

# OR Bun
docker build -f Dockerfile.bun \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api \
  -t campus-connect-frontend .
```

**Run the container:**

```bash
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.example.com/api \
  --restart unless-stopped \
  --name campus-connect-frontend \
  campus-connect-frontend
```

### ⭐ Support

If you find this template helpful, please consider giving it a star ⭐
You can also buy me a coffee if you'd like!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat-square&logo=buymeacoffee)](https://buymeacoffee.com/kir4n)

Cheers! 🥂

<!--

SEO keywords:

open source admin dashboard, nextjs admin dashboard, nextjs dashboard template,

shadcn ui dashboard, admin dashboard starter, next.js 16, typescript dashboard,

dashboard ui template, nextjs shadcn admin panel, react admin dashboard,

tailwind css admin dashboard

-->

---

## Star History

<a href="https://www.star-history.com/#Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Kiranism/next-shadcn-dashboard-starter&type=date&legend=top-left" />
 </picture>
</a>
