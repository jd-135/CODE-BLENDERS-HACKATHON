<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BIZ HACK '26 — Workspace Rules & Architecture Guide

## 1. Project Overview & Deadlines
- **Event**: BIZ HACK ’26 (Learning Center)
- **Submission Deadline / Code Freeze**: 2:30 PM (September 23, 2026)
- **Deliverables**: 
  1. Functional, high-polish Next.js Full-Stack Application
  2. Complete, up-to-date IEEE Software Requirements Specification (`BIZ_HACK_SRS.md`)

## 2. Technology Stack & Packages
- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4, Lucide React icons, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Component System**: shadcn/ui components in `src/components/ui/`
- **Data Layer**: Hybrid Repository Pattern (`src/lib/db/`)
  - **Offline Mode**: In-memory + Local State persistence (`src/lib/db/local-store.ts`)
  - **Cloud Mode**: Supabase Client (`@supabase/supabase-js`, `@supabase/ssr`)
  - **Seed Generator**: `@faker-js/faker`
- **Package Manager**: `pnpm` (strictly preferred for all installations and script executions)

## 3. Essential Commands
```bash
# Start local development server
pnpm dev

# Type check & build validation (Run before handing off tasks)
pnpm build
# or
pnpm tsc --noEmit

# Add additional shadcn components (cached locally if needed)
pnpm dlx shadcn@latest add <component_name>
```

## 4. Component & Directory Conventions
- `src/app/`: Next.js App Router pages, layouts, and API routes.
- `src/components/ui/`: Atomic shadcn/ui design primitives (Button, Card, Table, Badge, Dialog, Toast, Tabs, Avatar, Sonner).
- `src/components/features/`: Domain-specific business widgets, dashboard cards, and interactive workflows.
- `src/lib/db/`: Unified data store, repository interfaces, entity models, and seed generators.
- `src/lib/supabase/`: Client & server initialization with offline fallback guards.
- `src/lib/utils.ts`: `cn` class merge helper.

## 5. Offline-First & Git Discipline
1. **Zero External Blocker Policy**: Never write UI code directly dependent on live cloud responses without fallback. Use `import { db } from "@/lib/db"`.
2. **Deterministic Fallbacks**: If Wi-Fi is lost or Supabase credentials are not set, `db` automatically serves local mock/state data with zero UI code alterations.
3. **Continuous Verification**: Keep TypeScript clean. Every feature addition must pass `pnpm tsc --noEmit` and render without hydration errors.
4. **SRS Synchronization**: Keep `BIZ_HACK_SRS.md` updated as new API routes and features are added throughout the hackathon.
5. **Strict Git Push Policy**: Never execute `git push` automatically in the background. Only push to GitHub / Vercel when the user explicitly instructs to do so.
