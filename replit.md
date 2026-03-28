# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: SQLite via better-sqlite3 (for NETRA), PostgreSQL + Drizzle ORM (lib/db for future use)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Real-time**: Socket.IO

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (NETRA backend)
│   └── netra/              # React + Vite frontend (NETRA dashboard)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## NETRA Application

**నేత్ర (NETRA)** — Smart Bandobusth Duty Monitoring System for Anantapur Police  
Tagline: "మూయని నేత్రం — The Eye That Never Closes."

### Features
- Splash screen with animated eye SVG
- Login page with officer OTP login and admin password login
- Admin dashboard with live stat cards, officer status list, incident log, mini map, and breach chart
- Live map with Leaflet.js showing 5 duty zones, officer markers, radar sweep, and breach detection
- Personnel management with AI duty suggestions and print functionality
- Officer portal with face verification attendance and SOS emergency button
- Real-time Socket.IO for live updates, alerts, and panic overlay
- Demo mode for triggering breach scenarios
- SQLite backend with full REST API

### Auth
- Admin: username=`admin`, password=`netra@2025`
- Officers: mobile number OTP (any 6 digits work in demo mode)
- Guest admin: "Bypass & Enter as Guest Admin" link on login page

### Duty Zones
- Collectorate: lat 14.6819, lng 77.6006, radius 40m
- Gandhi Gunj: lat 14.6853, lng 77.5983, radius 35m
- RTC Bus Stand: lat 14.6791, lng 77.5969, radius 30m
- Subash Road: lat 14.6831, lng 77.5992, radius 25m
- Helipad: lat 14.6900, lng 77.6050, radius 50m

### Demo Officers
- P001: Ravi Kumar (CI) — Collectorate
- P002: Suresh Babu (SI) — Gandhi Gunj
- P003: Krishna Reddy (Constable) — RTC Bus Stand
- P004: Anand Sharma (SI) — Subash Road
- P005: Venkata Rao (Constable) — Helipad
- P006: Lakshmi Devi (DSP) — Collectorate
- P007: Ramana Murthy (Constable) — Gandhi Gunj
- P008: Sunita Reddy (SI) — RTC Bus Stand

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server for NETRA. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation. Uses better-sqlite3 for persistence and Socket.IO for real-time communication.

- Entry: `src/index.ts` — reads `PORT`, creates HTTP server, initializes Socket.IO, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON parsing, routes at `/api`
- Socket: `src/lib/socket.ts` — Socket.IO initialization and helpers
- DB: `src/lib/db.ts` — SQLite database with seeded officers and zones
- Auto-checks: `src/lib/autocheck.ts` — background timer for auto check-in/out and live position simulation
- Routes: auth, personnel, locations, alerts, dashboard, attendance, announcements, demo

### `artifacts/netra` (`@workspace/netra`)

React + Vite frontend for the NETRA system.

- Light mode design with sky blue accent
- Fonts: Rajdhani (headings/UI), Noto Sans Telugu (Telugu text), JetBrains Mono (IDs/coords/timestamps)
- Leaflet maps for live officer tracking
- Recharts for breach analytics
- Socket.IO client for real-time updates
- Framer Motion for page transitions
- Vite proxy configured to forward `/api` and `/socket.io` to the API server on port 8080
