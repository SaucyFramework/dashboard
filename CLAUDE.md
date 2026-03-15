# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`saucy/dashboard` is a Laravel package providing a monitoring and management dashboard for the Saucy event sourcing framework. It has a React 19 SPA frontend served by a JSON API backend. Supports Laravel 10-12 on PHP 8.2+.

The core `saucy/saucy` package lives at `../Saucy` (local path dependency). Refer to its `CLAUDE.md` for the event sourcing architecture.

## Commands

```bash
composer test                           # Run tests (Pest)
composer format                         # Format PHP (Laravel Pint)
composer analyse                        # Static analysis (PHPStan)
composer start                          # Build workbench + serve dev server
npm run dev                             # Vite dev server (frontend HMR)
npm run build                           # Build frontend to resources/dist/
```

After changing frontend code, run `npm run build` to update the compiled assets in `resources/dist/`.

## Architecture

### Backend

**Service provider** (`src/DashboardServiceProvider.php`): Uses `spatie/laravel-package-tools`. Registers config, views, routes, and assets. Binds `ProjectorMap` from `BuildSaucyProjectMappings`.

**Auth**: Password from `config('saucy-dashboard.password')`. When `null`, dashboard is open. When set, session-based login is enforced via `Authenticate` middleware. Session key: `saucy-dashboard.authenticated`.

**Routes** (`routes/web.php`): All under `/saucy-dashboard` prefix with `web` middleware.

Public (no auth):
- `GET/POST api/auth/check|login|logout`

Protected (auth required when password set):
- `GET api/stats` — system overview (event count, projection states, poison counts)
- `GET api/projections` — list all projections with status, position, process info
- `GET api/projections/{streamId}` — projection detail with activity log, config, process info
- `POST api/projections/{streamId}/pause|resume|trigger|replay` — projection actions
- `GET api/analytics/throughput|event-types|processing-speed` — analytics charts data
- `GET api/snapshots/{streamId}` — position history over time
- `GET api/events` — paginated event list with cursor, type/stream filtering
- `GET api/events/{globalPosition}` — event detail with payload, metadata, projection status
- `GET api/events/stream-names|types|new-count` — event store helpers
- `GET api/poison-messages` — list with status/subscription/stream filtering
- `GET api/poison-messages/{id}` — detail with full error and stack trace
- `POST api/poison-messages/{id}/retry|skip` — single message actions
- `POST api/poison-messages/bulk-retry|bulk-skip` — bulk actions with `{ ids: [...] }`
- `GET {any?}` — SPA catch-all returning `app.blade.php`

**Controllers** (`src/Http/Controllers/`):

| Controller | Purpose | Saucy core dependencies |
|---|---|---|
| `AuthController` | Check/login/logout | Config only |
| `StatsController` | System overview stats | `AllStreamSubscriptionRegistry`, `RunningProcesses` |
| `ProjectionsController` | List and show projections | `AllStreamSubscriptionRegistry`, `RunningProcesses`, `ActivityStreamLogger`, `ProjectorMap` |
| `ProjectionActionsController` | Pause/resume/trigger/replay | `AllStreamSubscriptionProcessManager` |
| `AnalyticsController` | Throughput, event types, processing speed | Direct DB queries on `event_store` and `subscription_activity_stream_log` |
| `SnapshotsController` | Position history | `ProjectionSnapshotStore` |
| `EventStoreController` | Browse events, types, stream names | `AllStreamSubscriptionRegistry`, `CheckpointStore`, `TypeMap`, `ProjectorMap` |
| `PoisonMessagesController` | List, show, retry, skip, bulk actions | `PoisonMessageStore`, `PoisonMessageManager` |

### Frontend

React 19 SPA built with Vite, styled with Tailwind CSS. Entry point: `resources/js/main.jsx`. Compiled to `resources/dist/app.js` and `resources/dist/app.css`.

**Routing** (react-router-dom v7):
- `/` — Dashboard (overview with stat cards, throughput chart, event type distribution)
- `/projections` — Projections list (search, status filter, sort, bulk actions)
- `/projections/:streamId` — Projection detail (progress, charts, activity log, actions)
- `/events` — Event store browser (infinite scroll, filtering, live polling, detail expansion)
- `/poison-messages` — Poison messages (status tabs, search, bulk retry/skip)
- `/poison-messages/:id` — Poison message detail (error, stack trace, retry/skip)
- `/login` — Password login

**Key files**:
- `App.jsx` — Router with protected route wrapper
- `api.js` — Centralized fetch client, dispatches 401 events for auto-logout
- `hooks/useAuth.jsx` — Auth context provider
- `hooks/usePolling.js` — Interval-based data fetching
- `hooks/useTheme.jsx` — Light/dark/system theme switching
- `hooks/useNotifications.jsx` — Toast notification system
- `components/Layout.jsx` — Sidebar navigation with collapsible menu and badge counts
- `components/ui/` — Shadcn-style component library (badge, button, card, chart, dialog, dropdown-menu, input, label, multi-select, progress, table, tooltip)
- `components/StatusIndicator.jsx` — Color-coded status badge
- `components/ActivityExtra.jsx` — Formats activity log data by type

**Charting**: Uses `recharts` for area, bar, pie, and line charts.

**Icons**: Uses `lucide-react`.

**JSON viewing**: Uses `react-json-view-lite` for expandable event payloads.

### Database Tables Read

This package reads from tables owned by `saucy/saucy`:
- `event_store` — Events
- `poison_messages` — Failed event processing
- `subscription_activity_stream_log` — Subscription activity
- `checkpoint_store` (via `CheckpointStore` interface)
- `running_processes` (via `RunningProcesses` interface)
- `background_replays` — Background replay state tracking
- `projection_snapshots` (via `ProjectionSnapshotStore` interface)

### Saucy Core Integration

Key classes consumed from `saucy/saucy`:
- `AllStreamSubscriptionRegistry` — All registered subscriptions
- `AllStreamSubscriptionProcessManager` — Pause, resume, trigger, replay projections
- `CheckpointStore` — Read checkpoint positions
- `RunningProcesses` — Active process tracking
- `ActivityStreamLogger` — Subscription activity logs
- `ProjectionSnapshotStore` — Position snapshots for charts
- `ProjectorMap` / `BuildSaucyProjectMappings` — Projector configuration and class info
- `TypeMap` — Map event type strings to PHP class names
- `PoisonMessageStore` / `PoisonMessageManager` — Poison message CRUD and retry/skip
- `BackgroundReplayManager` — Start, swap, cancel background replays
- `BackgroundReplayStore` — Query background replay status

## Conventions

- Controllers are plain classes (no base controller), dependencies injected via constructor or method injection
- All API responses return JSON via `response()->json()`
- Frontend components use function components with hooks
- UI components follow shadcn/ui patterns with `class-variance-authority` for variants
- Polling intervals: stats badge ~10s, page data ~5s, events live mode ~2.5s
- PHP formatted with Laravel Pint, JS has no formatter configured
