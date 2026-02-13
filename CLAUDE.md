# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`saucy/dashboard` is a Laravel package that provides a monitoring dashboard UI for the Saucy event sourcing framework's projections. Built with a React 19 SPA frontend and JSON API backend, styled with Tailwind CSS. Supports Laravel 10-12 on PHP 8.2+.

## Commands

```bash
composer test                # Run tests (Pest)
composer test-coverage       # Run tests with coverage
vendor/bin/pest --filter="test name"  # Run a single test
composer format              # Format code (Laravel Pint)
composer analyse             # Static analysis (PHPStan)
composer build               # Prepare package + build workbench
composer start               # Build + serve dev server via testbench
npm run dev                  # Vite dev server for frontend assets
npm run build                # Build frontend assets to public/
```

## Architecture

This is a Laravel package (not a standalone app). It uses `spatie/laravel-package-tools` for package scaffolding.

**Backend**: Laravel controllers returning JSON, protected by session-based auth middleware.

**Frontend**: React 19 SPA with react-router-dom, built with Vite, styled with Tailwind CSS. Entry point at `resources/js/main.jsx`, built to `public/app.js` and `public/app.css`.

**Entry point**: `DashboardServiceProvider` registers views, routes, config, and assets.

**Auth**: Password from `config('saucy-dashboard.password')`. When `null`, dashboard is open. When set, session-based login is enforced via `Authenticate` middleware.

**Routes** (`routes/web.php`): Mounted at `/saucy-dashboard` prefix with `web` middleware:
- `GET /api/auth/check` — auth status
- `POST /api/auth/login` — login with password
- `POST /api/auth/logout` — clear session
- `GET /api/projections` — list all projections (auth required)
- `GET /api/projections/{streamId}` — projection detail + activity (auth required)
- `POST /api/projections/{streamId}/pause|resume|trigger|replay` — projection actions (auth required)
- `GET /{any?}` — serve SPA shell (auth required)

**Controllers** (`src/Http/Controllers/`):
- `AuthController` — check/login/logout
- `ProjectionsController` — list and show projections
- `ProjectionActionsController` — pause/resume/trigger/replay

**React app** (`resources/js/`):
- `main.jsx` — entry point
- `App.jsx` — router with protected routes
- `hooks/` — useAuth, usePolling, useNotifications
- `components/` — Layout, Notifications, StatusIndicator, ActivityExtra
- `pages/` — Login, Dashboard, Projections, ShowProjection

**SPA shell** (`resources/views/app.blade.php`): Minimal HTML that loads the React app and injects CSRF token + config.

**Core dependency**: `saucy/saucy` (linked as a local path package at `../saucy`) provides the event sourcing subscription/projection infrastructure this dashboard monitors.

## Testing

Tests use Pest with Orchestra Testbench for an isolated Laravel environment. Architecture tests in `tests/ArchTest.php` enforce that `dd`, `dump`, and `ray` are never used in source code.

## Code Style

- PHP formatted with Laravel Pint (run `composer format`)
- PSR-4 autoloading under `Saucy\Dashboard\` namespace
- 4-space indentation, LF line endings
