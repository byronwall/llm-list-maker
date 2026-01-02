# SolidStart + Park UI (Panda CSS) Starter

This repo is a **starter project** that contains a **SolidStart** app inside the `app/` directory, with **Park UI conventions** and **Panda CSS** already configured and ready to use.

## What’s inside

- **SolidStart app**: `app/`
- **Park UI-style component wrappers**: `app/src/components/ui/*`
- **Ark UI (Solid) primitives**: via `@ark-ui/solid`
- **Panda CSS** tokens/recipes + codegen output: `app/src/theme/*` → `app/styled-system/` (generated)
- **Icons**: `lucide-solid`

## Getting started

Prereqs:

- **Node**: `>= 22`
- **Package manager**: `pnpm`

Run everything from `app/` (or use `pnpm -C app <cmd>` from the repo root):

```bash
pnpm -C app install
pnpm -C app dev
```

Other useful commands:

```bash
pnpm -C app prepare   # panda codegen
pnpm -C app build
pnpm -C app start
```

## Data loading & mutations (recommended approach)

This starter is meant to lean on **Solid Router / SolidStart** for app data:

- **Reads**: `query()` + `createAsync()`
- **Writes**: server actions
- **Avoid**: calling `fetch()` in UI components for app data, or adding React Query / SWR / etc.

See `app/AGENTS.MD` for the repo’s working rules and examples.

## UI & styling conventions

- Prefer importing UI from `~/components/ui/*` (Park UI-style wrappers) rather than using Ark UI primitives directly inside routes.
- Prefer Panda (`styled-system/css`, `styled-system/jsx`, `styled-system/recipes`) over ad-hoc CSS.
- Don’t edit `app/styled-system/` by hand (it’s generated).
