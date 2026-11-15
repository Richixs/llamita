<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/llamita-logo-para-fondo-oscuro.svg">
    <img src="public/brand/llamita-logo-para-fondo-claro.svg" alt="Llamita" width="220">
  </picture>
</p>

<p align="center">
  <strong>Wildfire and thermal hotspot monitoring with NASA satellite data, focused on Cochabamba, Bolivia.</strong>
</p>

<p align="center">
  <a href="https://github.com/Richixs/llamita/actions/workflows/ci.yml"><img src="https://github.com/Richixs/llamita/actions/workflows/ci.yml/badge.svg?branch=develop" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-E4632B" alt="License: AGPL-3.0"></a>
</p>

---

Llamita turns raw satellite fire detections from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) into a clear map, statistics and downloadable reports, so that fire brigades, municipal governments and communities can act before a fire grows.

- **Production:** https://llamita.richixs.dev
- **Development:** https://dev.llamita.richixs.dev

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Running with Docker](#running-with-docker)
- [API](#api)
- [Project structure](#project-structure)
- [Testing and CI/CD](#testing-and-cicd)
- [Contributing](#contributing)
- [Security](#security)
- [Data sources and credits](#data-sources-and-credits)
- [License](#license)

## Features

- **Interactive map** (Leaflet) with live FIRMS detections, sized and colored by fire radiative power (FRP), on a street or satellite basemap.
- **Geographic scope:** query by continent, country or the visible map area, plus a dedicated **Cochabamba** view for the local challenge.
- **Cochabamba filters:** detections assigned to their province and municipality, with the selected boundary outlined on the map.
- **Municipal layers:** authorized GAMC (Cochabamba municipal government) WMS layers, served through a secure server-side proxy.
- **Date filters:** a single day or a range, in Bolivia time (UTC−4), with history back to 2000.
- **Sensor filter:** VIIRS, MODIS or both, harmonized so one fire shows up as one point (see [How it works](#how-it-works)).
- **Statistics** page with charts and rankings.
- **Reports** with previews, exported as **PDF, Excel, CSV, Shapefile (ZIP) or GeoJSON**, always citing the data source.
- **Caching:** repeated queries are served from an in-memory cache, optionally shared through Redis, to protect the FIRMS quota.

## How it works

### Data flow

```
Browser ──► /api/firms/hotspots ──► cache (memory / Redis) ──► NASA FIRMS API
   ▲                │
   └── JSON ◄───────┴── validate → fetch in 5-day chunks → parse CSV → harmonize
```

The FIRMS `MAP_KEY` and the GAMC key never leave the server: the browser only talks to Llamita's own API routes.

### MODIS and VIIRS harmonization

FIRMS publishes detections from two instruments with different resolutions:

| Sensor | Satellites              | Pixel size |
| ------ | ----------------------- | ---------- |
| MODIS  | Aqua, Terra             | 1 km       |
| VIIRS  | S-NPP, NOAA-20, NOAA-21 | 375 m      |

About seven VIIRS pixels fit inside one MODIS pixel, so the same fire would otherwise appear several times. [`src/lib/firms/grid.ts`](src/lib/firms/grid.ts) fixes this:

1. Snap every detection to a common **~1 km grid**, calibrated to Cochabamba's latitude (−17.4°).
2. Group detections that share the same **Bolivia-local day and grid cell**: they are one fire event.
3. Collapse each group into **one record**: VIIRS coordinates when available (finer resolution), the **maximum FRP** (not the sum, which would double-count overlapping pixels), plus `detectedBy` and `observationCount` to keep provenance.

## Tech stack

| Area        | Tools                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org/) (App Router, React Compiler, `standalone` output), [React 19](https://react.dev/)                   |
| Language    | TypeScript (strict)                                                                                                                   |
| Map and geo | [Leaflet](https://leafletjs.com/), [Turf](https://turfjs.org/) (point-in-polygon)                                                     |
| Styling     | [Tailwind CSS 4](https://tailwindcss.com/) and design tokens in `src/app/globals.css`                                                 |
| Exports     | [jsPDF](https://github.com/parallax/jsPDF), [SheetJS](https://sheetjs.com/), [@mapbox/shp-write](https://github.com/mapbox/shp-write) |
| Cache       | In-memory cache, optional [Redis](https://redis.io/)                                                                                  |
| Tooling     | pnpm, ESLint, Prettier, Node.js test runner                                                                                           |
| Delivery    | Docker, GitHub Actions, GHCR, Kubernetes (Kustomize, GitOps)                                                                          |

## Getting started

### Prerequisites

- **Node.js 26** (the version used by CI and Docker)
- **pnpm 11** — the exact version is pinned in `package.json` (`packageManager`). The easiest way to get it is Corepack:

  ```bash
  corepack enable
  ```

- A free **NASA FIRMS MAP_KEY**: https://firms.modaps.eosdis.nasa.gov/api/map_key
- _(Optional)_ Docker, to run Redis or the whole app in containers.

### Setup

```bash
git clone https://github.com/Richixs/llamita.git
cd llamita
pnpm install
cp .env.example .env.local   # then fill in your keys
pnpm dev
```

Open http://localhost:3000.

> `.env.local` is ignored by git. Never commit real keys.

## Environment variables

Defined in [`.env.example`](.env.example). All of them are **server-only**.

| Variable        | Required             | Description                                                                                                      |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `FIRMS_MAP_KEY` | Yes                  | NASA FIRMS API key. Without it, live detections can't be fetched.                                                |
| `GAMC_API_KEY`  | For municipal layers | Credential for the GAMC WMS proxy. Ask the team for it.                                                          |
| `REDIS_URL`     | No                   | Shared cache, e.g. `redis://127.0.0.1:6379`. If unset or unreachable, the app falls back to its in-memory cache. |

Locally, Next.js reads `.env.local`. Docker Compose reads `.env` (see below).

## Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Start the development server with hot reload |
| `pnpm build`        | Build for production                         |
| `pnpm start`        | Serve the production build                   |
| `pnpm lint`         | Run ESLint                                   |
| `pnpm format`       | Format all files with Prettier               |
| `pnpm format:check` | Check formatting without changing files      |
| `pnpm test`         | Run the test suite in `tests/`               |

## Running with Docker

[`compose.yml`](compose.yml) defines three services, selected with profiles:

```bash
# Only Redis, for local development with `pnpm dev`
docker compose up -d redis

# Development: app with hot reload + Redis
docker compose --profile dev up

# Production-like: optimized image + Redis
docker compose --profile prod up --build
```

Both app profiles read secrets from a `.env` file at the project root (`cp .env.example .env`) and connect to the `redis` service automatically.

The [`Dockerfile`](Dockerfile) is multi-stage (Node 26 Alpine), runs as a non-root user and ships Next.js' `standalone` output.

## API

All routes are `GET` and return JSON. Errors come back as `{ "error": "..." }` with a 4xx or 5xx status.

| Route                     | Parameters                                                                                                                                  | Description                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/api/firms/hotspots`     | `from`, `to` (YYYY-MM-DD), `bbox` (`west,south,east,north` or `world`), `sensor` (`all`, `VIIRS`, `MODIS`), optional `continent`, `country` | Harmonized detections used by the app. Up to 366 days (5 for very wide areas), from 2000 onward. |
| `/api/firms/area`         | `source`, `bbox`, `dayRange`, `date`                                                                                                        | Raw FIRMS area query                                                                             |
| `/api/firms/country`      | `source`, `code` (ISO-3, e.g. `BOL`), `dayRange`, `date`                                                                                    | Raw FIRMS country query                                                                          |
| `/api/firms/countries`    | —                                                                                                                                           | Countries supported by FIRMS                                                                     |
| `/api/firms/availability` | `sensor`                                                                                                                                    | Date range available per FIRMS source                                                            |
| `/api/firms/status`       | —                                                                                                                                           | Transaction usage of the configured `MAP_KEY`                                                    |
| `/api/gamc/wms`           | `layer` + standard WMS parameters                                                                                                           | Proxy for the authorized GAMC layers (`GetMap`, `GetLegendGraphic`, `GetFeatureInfo`)            |
| `/api/geo/boundary`       | `type` (`province` or `municipality`), `name`                                                                                               | One Cochabamba boundary as GeoJSON                                                               |

Example:

```
/api/firms/hotspots?from=2026-11-01&to=2026-11-07&bbox=-67.9,-18.9,-63.5,-15.5&sensor=all
```

## Project structure

```
src/
├── app/                 # Routes (App Router)
│   ├── page.tsx         # Map
│   ├── estadisticas/    # Statistics
│   ├── reportes/        # Reports and PDF preview
│   ├── acerca-de/       # About and data sources
│   └── api/             # Server routes: firms/, gamc/, geo/
├── components/          # UI: map, filters, charts, report builder, header…
└── lib/
    ├── firms/           # FIRMS client, validation, queries, grid harmonization
    ├── gamc/            # Secure GAMC WMS proxy
    ├── geo/             # Boundaries, scopes, catalogs, GeoJSON data
    ├── cache/           # In-memory + Redis query cache
    └── llamita/         # Domain data, filters, reports, exports, hotspot styles
tests/                   # Backend and export tests (Node.js test runner)
public/brand/            # Logos
.github/workflows/       # CI and CD
```

## Testing and CI/CD

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request to `main` and `develop`: format check, lint, tests and build.
- **CD** ([`cd.yml`](.github/workflows/cd.yml)) runs on pushes to `develop` and `main`: it builds the Docker image, pushes it to GitHub Container Registry and updates the GitOps manifests for the matching environment.

| Branch    | Environment | URL                             |
| --------- | ----------- | ------------------------------- |
| `develop` | development | https://dev.llamita.richixs.dev |
| `main`    | production  | https://llamita.richixs.dev     |

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the branch workflow, commit style, checks and code rules.

In short: branch off `develop`, open the pull request against `develop`, and make sure all checks pass.

## Security

- Secrets (`FIRMS_MAP_KEY`, `GAMC_API_KEY`) live only in `.env.local` / `.env` locally and in the deployment's secret store. They are never committed, logged or exposed to the browser, and never use the `NEXT_PUBLIC_` prefix.
- All user input to the API routes is validated on the server.
- If a key is ever leaked, rotate it right away: deleting it from git history is not enough.

To report a vulnerability, contact the maintainers privately instead of opening a public issue.

## Data sources and credits

- **Fire detections:** [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — MODIS Collection 6.1 and VIIRS 375 m active fire products. _We acknowledge the use of data and imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS)._
- **Municipal layers:** Gobierno Autónomo Municipal de Cochabamba (GAMC), used with authorization.
- **Province and municipality boundaries:** [geoBoundaries](https://www.geoboundaries.org/) (derived from GeoBolivia).
- **Basemaps:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors; satellite imagery © Esri, Maxar, Earthstar Geographics.
- **Fonts:** Space Grotesk, IBM Plex Sans and IBM Plex Mono (SIL Open Font License).

## License

Llamita is free software under the [GNU Affero General Public License v3.0](LICENSE). If you run a modified version as a network service, you must make its source code available to its users.
