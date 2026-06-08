# Execution plan: React/Next migration to a minimalist tech blog/persona site

This plan is the single source of truth for handoff and completion.

## Purpose

Move the site from runtime Python template rendering to a static/build-time React/Next.js frontend while keeping FastAPI as the data/API host. The visible behavior after completion is a minimalist layout with notebook-like posts represented as markdown + code/output/chart cells and an interactive coursework map embedded with existing D3 assets.

## Progress

- [x] Stand up `frontend/` with App Router + TypeScript pages for `/`, `/about`, `/blog`, `/blog/[slug]`, `/coursework`, and `/404`.
- [x] Implement markdown parser for `python`, `output`, and `chart` blocks with fixtures.
- [x] Implement deterministic front-end rendering for code, output, and chart blocks and a collapsible details sidebar.
- [x] Implement backend API endpoints `/api/posts`, `/api/posts/{slug}`, `/api/page/{slug}`, `/api/coursework`.
- [x] Add static artifact serving in FastAPI (`/` and known routes) and keep SEO/feeds on Python.
- [x] Preserve coursework treemap behavior using copied assets (`app/static/coursework.{css,js}` + `courses.json`) under `frontend/public/static`.
- [x] Update runbook and developer docs for new workflow.
- [ ] Run `npm --prefix frontend run parser:test` in a clean environment and confirm pass.
- [ ] Run `npm --prefix frontend run build` and generate screenshots via `scripts/ui_screenshots.sh`.
- [ ] Close any remaining responsive/overflow exceptions from the new layout.

## Surprises & discoveries

- The old Python templating route layer depended on old `Post` and `Page` attributes; a minimal compatibility layer in `app/services/content.py` was required to keep existing imports safe.
- Next.js route snapshots are now file-system based at build time, so content changes are best validated with parser fixtures plus screenshot loops.

## Decision log

- Decision: Keep FastAPI as API and static host while Next renders all user pages.
  - Rationale: minimizes runtime complexity and keeps deployment behavior close to existing infra.
- Decision: Prefer lightweight chart JSON embedded in markdown cells over marimo full notebook exports.
  - Rationale: improves performance and consistency with the minimalist layout goal.
- Decision: Keep existing interactive coursework implementation as opt-in static JS/CSS embed.
  - Rationale: preserves high-signal interaction without rebuilding treemap logic during migration.

## Outcomes & retrospective

The migration foundation is now in place. The biggest remaining risk is operational validation in CI (parser checks, frontend build, and visual checks), not architectural correctness. The code path is now clear: content changes happen in `content/posts`, parser transforms happen in `frontend/lib/content.ts`, and rendering stays in React components.

## Validation instructions

- API sanity: run backend tests in this repo.
- Frontend parser checks: run `npm --prefix frontend run parser:test`.
- Frontend build: run `npm --prefix frontend run build`.
- Visual checks: run `scripts/ui_screenshots.sh` after Next is reachable.
- If any step fails, update this document’s `Progress` and `Surprises & discoveries` entries before resuming work.
