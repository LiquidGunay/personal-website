# ExecPlan: Parallel Redesign + SEO + AI Discoverability + Marimo/Vega Optimization

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This repository follows `ExecPLANS.md`; this file is the authoritative execution plan replacing legacy `PLAN.md` for active work tracking.

## Purpose / Big Picture

After this change, `https://gunayintheory.com` will present a redesigned, responsive, and performant personal site for Gunay Soni, with complete technical SEO metadata, AI crawler discoverability, and repeatable testing workflows. In parallel, the sibling `semantic-entropy-probe-comparison` repository will get notebook performance and result-storytelling improvements using marimo and Vega/VegaFusion-informed constraints.

## Progress

- [x] (2026-02-10 16:00Z) Audited both repositories and collected requirements.
- [x] (2026-02-10 16:10Z) Researched marimo, Altair, Vega-Lite, and VegaFusion docs.
- [x] (2026-02-10 16:35Z) Added foundational SEO/config services in `personal-site` and started redesign implementation.
- [x] (2026-02-10 16:40Z) Added metadata-aware page rendering, canonical handling, and profile content updates.
- [x] (2026-02-10 16:45Z) Added `/robots.txt`, `/sitemap.xml`, `/llms.txt` routes and tests.
- [x] (2026-02-10 17:05Z) Created and validated repo-local + global skills (`personal-site-testing`, `marimo-notebook-testing`).
- [x] (2026-02-10 17:20Z) Implemented sibling notebook optimization milestones and benchmark script.
- [x] (2026-02-10 17:25Z) Ran validation (`pytest`, screenshots, marimo run/export, benchmark) and captured evidence.
- [ ] Complete SEO operations checklist (Search Console/Bing steps and indexing requests).

## Surprises & Discoveries

- Observation: `AGENTS.md` required `PLANS.md`, but only `PLAN.md` existed.
  Evidence: repository file listing before implementation.
- Observation: Production host `https://gunayintheory.com` is reachable; `www` was not resolving at planning time.
  Evidence: direct HTTP checks performed on 2026-02-10.
- Observation: Current app had no public routes for `robots.txt`, `sitemap.xml`, or `llms.txt`.
  Evidence: inspected `app/main.py` route set.
- Observation: Existing marimo notebook already reduced payload in parts, but still mixed chart/detail-heavy data paths.
  Evidence: inspected `notebooks/probe_analysis.py` and dataset builder script.
- Observation: marimo server mode failed initially due duplicate variable names across cells.
  Evidence: `marimo run notebooks/probe_analysis.py` reported `multiple-definitions` diagnostics.
- Observation: sibling repo default environment did not include pytest as an installed tool.
  Evidence: `uv run python -m pytest -q` failed with `No module named pytest`; resolved via `uv run --with pytest ...`.

## Decision Log

- Decision: Canonical host is `https://gunayintheory.com` (apex).
  Rationale: user selection and current DNS behavior.
  Date/Author: 2026-02-10 / User + Codex.
- Decision: Keep IA scope fixed to `/`, `/blog`, `/coursework`.
  Rationale: deliver depth and quality without route expansion.
  Date/Author: 2026-02-10 / User + Codex.
- Decision: Allow OpenAI and major AI crawler families in crawler policy.
  Rationale: maximize discoverability across AI surfaces.
  Date/Author: 2026-02-10 / User + Codex.
- Decision: Create both skills now and keep local/global mirrored copies.
  Rationale: immediate operational reuse across iterative implementation.
  Date/Author: 2026-02-10 / User + Codex.
- Decision: Prioritize robust dataset-shaping optimizations for marimo/WASM; treat VegaFusion as feasibility-checked enhancement.
  Rationale: compatibility and reliability across both server and WASM execution.
  Date/Author: 2026-02-10 / User + Codex.

## Outcomes & Retrospective

Current implementation outcomes:

- Personal-site redesign shipped with new metadata-aware rendering and crawler/SEO endpoints.
- Canonical feed/sitemap/robots/llms paths are now implemented and tested.
- Screenshot regression set regenerated for all required routes and viewports.
- Two testing skills were created locally and mirrored globally; both pass quick validation.
- Sibling notebook workflow now emits split chart/detail datasets and a benchmark report.

Remaining outcomes:

- Execute external SEO operations (Search Console/Bing verification and indexing submissions).

## Context and Orientation

Personal-site implementation files:

- `app/main.py` routes.
- `app/views/pages.py` HTML/layout/meta rendering.
- `app/services/content.py` frontmatter/content parsing.
- `app/services/rss.py` feed generation.
- `app/services/site_config.py` canonical/site metadata config.
- `app/services/seo.py` robots/sitemap/llms generation.
- `app/static/base.css` global style system.
- `tests/integration/test_app.py`, `tests/unit/test_content.py`, `tests/unit/test_seo.py` validation.

Sibling repo implementation files:

- `../semantic-entropy-probe-comparison/notebooks/probe_analysis.py`
- `../semantic-entropy-probe-comparison/notebooks/probe_analysis_wasm.py`
- `../semantic-entropy-probe-comparison/scripts/07_build_analysis_dataset.py`
- `../semantic-entropy-probe-comparison/PLAN.md`

## Plan of Work

Implement workstreams in parallel where dependency-safe:

1. Personal-site redesign and metadata integration.
2. SEO crawler routes and canonical infrastructure.
3. Gunay Soni profile content upgrade and author signals.
4. Testing expansion and skill creation/mirroring.
5. Sibling notebook data separation, interaction optimization, VegaFusion feasibility check, and benchmark capture.

## Concrete Steps

From `/home/ubuntu/personal-site`:

1. Implement app/services and rendering changes.
2. Update content frontmatter and About content.
3. Add crawler/sitemap/llms endpoints and tests.
4. Run:
   - `uv run pytest -q`
   - `scripts/ui_screenshots.sh`
5. Create skills via skill-creator tooling in `.codex/skills/*` and mirror to `/home/ubuntu/.codex/skills/*`.
6. Validate skills with `quick_validate.py`.

From `/home/ubuntu/semantic-entropy-probe-comparison`:

1. Split chart/detail output paths in analysis dataset builder.
2. Update notebooks to use reduced chart payloads and lazy detail views.
3. Add benchmark script for load/render/interaction.
4. Run:
   - `uv run pytest -q`
   - `python scripts/07_build_analysis_dataset.py ...`
   - `uv run marimo run notebooks/probe_analysis.py --host 127.0.0.1 --port 7860`
   - `marimo export html-wasm notebooks/probe_analysis_wasm.py -o <out_dir> --mode run`

## Validation and Acceptance

- Pages `/`, `/blog`, `/coursework` render redesigned layout across desktop/tablet/mobile.
- Metadata includes canonical, description, OG/Twitter, and JSON-LD on major pages.
- New routes `/robots.txt`, `/sitemap.xml`, `/llms.txt` return correct content.
- RSS links are canonicalized to `https://gunayintheory.com`.
- Personal content references Gunay Soni explicitly and consistently.
- Skills exist in repo-local and global paths and pass quick validation.
- Sibling notebook benchmarks show measurable improvements without result regressions.

## Idempotence and Recovery

- Service/rendering changes are additive and safe to rerun.
- Skill generation should skip/rewrite in-place safely when paths already exist.
- If metadata changes regress rendering, revert only affected service/view files and rerun tests.
- If notebook optimizations regress, keep chart/detail split and roll back only specific visualization cell logic.

## Artifacts and Notes

Implementation evidence to capture during completion:

- `artifacts/playwright/*.png` screenshots.
- `pytest` output summaries for both repos.
- notebook benchmark output files.
- skill validation output.
- SEO operations checklist dates (Search Console/Bing/indexing requests).

## Interfaces and Dependencies

- Use `app.services.site_config.get_site_config()` as the single source of truth for canonical URLs and author metadata.
- Use `app.services.seo` for robots/sitemap/llms text generation.
- Keep page metadata generation in `app/views/pages.py` where route context is available.
- For marimo, optimize upstream dataset shape before chart rendering; use Vega/VegaFusion options as compatibility-checked enhancements.

## Change Note

2026-02-10: Created `PLANS.md` as authoritative execution plan, migrated active tracking from `PLAN.md`, and began implementation aligned with this plan.
