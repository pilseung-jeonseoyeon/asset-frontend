# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`asset-frontend` is the frontend for **Monit** (모닛), a personal asset management app (대시보드, 자산, 주식, 가계부, 설정). The repo is currently a freshly-initialized Vite + React scaffold; app screens have not been built out yet.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml` is committed — do not use npm/yarn).

```bash
pnpm install       # install deps
pnpm dev           # start Vite dev server with HMR
pnpm build         # tsc -b (project references) + vite build
pnpm lint          # oxlint (rules in .oxlintrc.json)
pnpm preview       # preview the production build
```

There is no test runner configured yet.

## Architecture

- Standard Vite + React 19 + TypeScript app: entry `src/main.tsx` → `src/App.tsx`. `index.html` mounts `#root`.
- TypeScript uses project references (`tsconfig.json` → `tsconfig.app.json` for `src/`, `tsconfig.node.json` for Vite config). Run `tsc -b`, not `tsc`, for full builds.
- Linting is via `oxlint` (Rust-based), configured in `.oxlintrc.json`, not ESLint.

## Design system (`docs/ds_rules_v2_5.md`)

Before writing or changing any UI, read `docs/ds_rules_v2_5.md` — it is the single source of truth for colors, typography, radii, shadows, dark mode, and copy conventions. Do not invent values outside it. Key constraints:

- **Color is minimal**: only 4 chromatic groups are allowed — semantic up/down (초록/빨강), the indigo accent, the income/expense/savings pastel trio, and financial-institution brand colors (icons only, per the master table in §12). Everything else is neutral/monotone.
- All colors, shadows, and radii are CSS custom properties (`--canvas`, `--surface`, `--border`, `--accent`, `--deep-*`, `--ramp-*`, `--inc/exp/sav-*`, etc.) defined for light in `:root` and swapped for dark in `html.theme-dark`. **Never hardcode hex/rgba inline** and never implement dark mode via `filter: invert()`/`hue-rotate()`.
- Border radius is limited to 4 fixed values (10px cards/buttons/modals, 8px small elements, 4px micro-indicators, 999px for full circles) — see §5.
- Only 3 shadow tokens exist (`--shadow-card`, `--shadow-pop`, `--shadow-modal`) — see §6.
- Screen title is always the literal string `Monit`, never the page name (§4-1).
- Transaction types (수입/지출/저축/이체) each have fixed color/sign conventions — see §10-4 before touching 가계부 (ledger) logic.
- Font is Pretendard, weight capped at 700.

`docs/Asset Manager v14.dc.html` + `docs/support.js` are a **generated, read-only interactive design prototype** (a self-contained `dc-runtime` renderer), not part of the app build — useful as a visual reference for intended screens, but never edit `support.js` (it's a build artifact of a separate `dc-runtime` tool) or treat the `.dc.html` file as source to copy into the React app verbatim.
