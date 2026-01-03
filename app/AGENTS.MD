# AGENTS.md — Working in this repo

## Quick rules (read first)

- **Generated output**

  - `app/styled-system/` is **generated** by Panda — **do not edit by hand**.
  - If styles/types look wrong, run `pnpm prepare` (or `pnpm dev`, which runs it first).

- **Data loading (SolidStart)**

  - **Reads**: `query()` + `createAsync()`
  - **Writes**: server actions
  - **Avoid**: `fetch()` in UI components for app data, and adding React Query/SWR/etc.

- **Component size & composition**

  - Prefer **small components** that do one thing well; keep files **~200 lines** when feasible.
  - If a component/file is trending **beyond ~200 lines**, plan to **split early** (before it becomes a 1000+ line file).
  - Split into **separate files** when possible (subcomponents, hooks, helpers, types).
  - Avoid excessive **prop drilling**; it’s OK to create a **shared context** (or a small store) when multiple siblings/levels need the same state.
  - Do not extract CSS-in-JSS styles into a separate file unless they are used in multiple components. ALWAYS prefer keeping styles next to their users.

- **UI + styling**

  - Prefer `~/components/ui/*` (Park UI-style wrappers) over direct Ark UI usage in routes.
  - Prefer Panda (`css`, `styled-system/jsx`, `recipes`) over ad-hoc CSS.

- **Routes are routes**

  - Avoid creating reusable UI components under `app/src/routes/` — files/folders there define real routes.
  - Keep route modules focused on routing + data + page composition; move reusable UI to `app/src/components/` (or `~/components/*`).

---

## Repo overview

This is a **SolidStart** app that uses:

- **Park UI conventions** for the component layer (see `app/components.json`)
- **Ark UI (Solid)** primitives (`@ark-ui/solid`)
- **Lucide (Solid)** icons (`lucide-solid`)
- **Panda CSS** for tokens/recipes + codegen into `app/styled-system/`

UI wrappers live in: `app/src/components/ui/*`  
Theme/tokens live in: `app/src/theme/*`

---

## Getting started

Prereqs:

- **Node**: `>= 22` (see `app/package.json`)
- **Package manager**: `pnpm`

Run commands **from `app/`** (or use `pnpm -C app <cmd>`):

- Install: `pnpm install`
- Generate Panda artifacts: `pnpm prepare`
- Dev server: `pnpm dev` _(runs `pnpm prepare` first)_
- Build: `pnpm build`
- Start: `pnpm start`

---

## Key paths & conventions

Core paths:

- App entry: `app/src/app.tsx`
- UI components: `app/src/components/ui/`
- Theme (tokens/recipes/global css): `app/src/theme/`
- Panda config: `app/panda.config.ts` → outputs `app/styled-system/`
- Global CSS layers: `app/src/index.css`

Path aliases (see `app/tsconfig.json`):

- `~/*` → `app/src/*`
- `styled-system/*` → `app/styled-system/*`

Recommended imports:

- UI wrappers: `~/components/ui/<component>`
- Icons: `import { CheckIcon, XIcon } from "lucide-solid"`
- Panda:
  - `import { css } from "styled-system/css"`
  - `import { VStack } from "styled-system/jsx"`
  - `import { button } from "styled-system/recipes"`

---

## Working on UI

Preferred approach:

- Use existing wrappers in `~/components/ui/*`.
- If you need a new primitive:
  - Build it as a wrapper in `app/src/components/ui/<name>/`
  - Base it on Ark UI primitives/contexts
  - Style via Panda (`css`/`jsx`) and add/extend recipes when variants matter
- If a route/component is getting large, extract UI into `~/components/*` and shared state into a context/store to keep routes readable.

Styling rules of thumb:

- Prefer recipes for variants/sizes and consistent tokens.
- Prefer `styled-system/jsx` layout primitives for structure.
- Avoid one-off CSS unless it’s truly global (then put it in the theme/global layers).

UX rules of thumb:

- Prefer **progressive disclosure** where possible — use tooltips and hover cards to reveal info without rendering it to screen constantly.
- Prefer placing **forms inside popovers** with a simple/small trigger indicating what happens — avoid rendering large forms as default visible.

Discover what UI wrappers exist:

- `ls app/src/components/ui`
- Grep for usage patterns:
  - `rg "from \"~\/components\/ui" app/src`

---

## Client ↔ server communication (SolidStart)

Use SolidStart’s SSR-friendly data APIs.

- **Do**

  - Reads: `query()` (server) + `createAsync()` (client)
  - Writes: server actions
  - Keep server-only logic on the server; keep components mostly declarative

- **Avoid**
  - Raw `fetch(...)` inside UI components for app data
  - Introducing other client data frameworks (React Query, SWR, etc.)

Example (read via query):

```ts
import { query, createAsync } from "@solidjs/router";

// server-side fetcher; args must be JSON-serializable
export const getThing = query(async (id: string) => {
  // ... load data (db/service/etc) ...
  return { id };
}, "thing");

// client usage (route/component)
const thing = createAsync(() => getThing("123"));
```
