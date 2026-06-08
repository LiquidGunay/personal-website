# Personal Site React/Next Migration Plan

## Progress

- [x] Build a React/Next.js App Router frontend under `frontend/` and route map `/`, `/about`, `/blog`, `/blog/[slug]`, `/coursework`, `/404`.
- [x] Move blog content into markdown posts with custom cell fences and parser tests.
- [x] Expose backend API contracts for posts/pages/coursework via FastAPI.
- [x] Keep frontend artifacts served from `frontend/out` for production and `/about`, `/blog`, `/coursework` via SPA fallback.
- [x] Preserve interactive coursework treemap flow by reusing existing `app/static/coursework.*` assets.
- [ ] Run and pass `frontend` parser tests after every parser change.
- [ ] Run `npm --prefix frontend run build`, `scripts/ui_screenshots.sh`, and backend tests before release.
- [x] Keep documentation (`README.md`, `PLANS.md`, `ExecPLANS.md`) aligned with current architecture.

## Current status

The migration is implemented and runnable. The remaining work is production-readiness validation: building the frontend artifact, running parser checks in a fresh environment, and refreshing screenshot baselines.

## Next actions

1. Run parser + frontend checks in CI and enforce route snapshots for `/`, `/about`, `/blog`, `/blog/semantic-entropy-probe-comparison`, `/coursework`.
2. Run screenshot checks and verify overflow behavior at desktop/tablet/mobile sizes.
3. Publish the `frontend/out` artifact generation step in deployment scripts if host split is accepted later.
