## Personal Site and Blog – Architecture and Delivery Plan

### Goals
- **Primary**: Publish technical blogs to learn in public and signal skills.
- **Secondary**: Showcase projects and embed live/dynamic visualizations with minimal client-side bloat.
- **Approach**: Keep it Python-first (FastHTML, Python 3.12, `uv`), simple to author via git.

### Stack Decisions
- **Language/Runtime**: Python 3.12
- **Package/Env**: `uv` for dependency and environment management
- **Web framework**: FastAPI + FastHTML components (ASGI, Uvicorn)
- **Templating/UI**: FastHTML for componentized HTML; minimal CSS (utility-first or simple custom CSS). Dark/light mode toggle.
- **Content**: Markdown files with YAML frontmatter stored in-repo; no DB for v1
- **Static assets**: Images and attachments in `content/assets/`; later move to S3-compatible storage
- **Analytics**: Plausible (hosted) – privacy-friendly, lightweight, easy to add/remove
- **CI/CD**: GitHub Actions (ruff, mypy, pytest+coverage); deployment via Railway GitHub integration
- **Container**: None in v1 (Railway buildpacks/Nixpacks); Docker optional later for portability
- **Hosting**: Railway for v1; optional Fly.io later. Domain via any registrar; DNS to hosting provider.

### Content Model (Markdown-first)
- **Location**: `content/posts/<slug>/index.md` with optional media alongside
- **Frontmatter** (min): `title`, `slug`, `date`, `summary`, `tags`, `draft`, `updated`, `cover_image`
- **Parsing**: `markdown-it-py` + plugins for tables, footnotes, task lists; code highlighting via Pygments
- **Routing**:
  - `/` – homepage with latest posts
  - `/blog` – paginated list
  - `/blog/<slug>` – post detail
  - `/tags/<tag>` – tag archive (optional in v1)
  - `/feed.xml` – RSS/Atom
  - `/sitemap.xml`, `/robots.txt`
- **Search**: not in v1; future: prebuilt Lunr index (opt-in, tiny JS)

### Tradeoffs: Markdown vs DB-backed CMS
- **Markdown (chosen for v1)**
  - Pros: simple authoring in git, versioning, zero infra, fully local/offline, easy review via PRs, predictable builds
  - Cons: limited editorial tooling (no WYSIWYG/admin), heavy taxonomy/queries require building indices, no multi-user workflow
- **DB-backed CMS** (headless or traditional)
  - Pros: richer querying (by tags/date), multi-author workflows, scheduling/drafts, web editor, future comments/auth fit better
  - Cons: introduces infra (DB, migrations, backups), auth/security surface, more moving parts; overkill for solo v1

Conclusion: Markdown now; revisit DB if/when you need web editing, comments, advanced querying, or multi-user.

### RSS: What and Why
- **Utility**: Lets readers and aggregators subscribe; enables cross-posting (e.g., dev.to, Medium import), newsletter tools, and discoverability.
- **Cost**: Minimal – generate `feed.xml` from posts’ frontmatter; updated on deploy.

### Dynamic Visualizations Strategy
- **Altair**: Render to HTML/JS and embed inline on post pages. Provide static PNG fallbacks for RSS/OpenGraph.
- **Plotly**: Same as Altair; embed inline; ensure lightweight bundles (serve CDN or minimal assets).
- **Marimo**: Serve as separate app routes (e.g., `/apps/<app_name>`), embedded via `<iframe>` in posts.
  - Downsides of iframes: extra load boundary, limited SEO for embedded content, cross-origin messaging complexity, styling isolation, potential double scrollbars.
  - Upsides: strong isolation, crash containment, simpler integration, independent lifecycle; ideal for live apps.
- **JS policy**: Keep inline embeds minimal; no full SPA. Only include necessary vendor scripts per page.

### When Do We Need a Database?
- Not needed for v1. Consider later for: comments/auth, rich queries (e.g., by tag/date with pagination across thousands of posts), scheduled publishing, user profiles, form submissions, or if content moves off-repo.

### SEO and Social
- Canonical URLs, OpenGraph/Twitter meta, `sitemap.xml`, `robots.txt`.
- Per-post OG image (future: automated OG card rendering).

### Analytics
- **V1**: None. Keep pages lightweight; focus on content.
- **Roadmap option**: Umami (self-host, Postgres) for privacy-friendly analytics at low cost.
- **Alternatives**: Plausible (hosted, simplest) or GA4 (free but heavier and with privacy tradeoffs).

### Testing Strategy
- **Unit**: Markdown parsing, frontmatter validation, slug/date utilities.
- **Integration**: ASGI routes via `httpx.AsyncClient`; ensure pages render and include essential meta.
- **E2E (optional)**: Playwright against a built container to validate critical flows (home, blog index, post page, feed). Run locally or nightly to avoid CI cost/time.
- **Quality gates**: ruff (lint+fmt), mypy (strict-ish on app code), pytest with coverage threshold.

### CI/CD (GitHub Actions)
- Jobs:
  1) Lint/Type/Test: `uv sync` -> ruff -> mypy -> pytest (cache deps)
  2) Deploy: via Railway GitHub integration on `main` after checks pass (no Docker build in v1)
- Preview envs: optional; Railway can create previews per PR if enabled.

### Deployment
- **Build**: Railway Nixpacks/buildpacks builds directly from repo (no Docker in v1).
- **Serve**: `uvicorn app.main:app` (FastAPI+FastHTML). Static files under `/static`; CDN later if needed.
- **Hosting**: Railway service; choose a region near you; map custom domain and TLS via Railway.
- **Environment**: `ENV=production`, base URL, author profile (analytics env not needed in v1).

### Repository Structure
```
.
├── app/
│   ├── main.py                 # FastAPI app, routes, middleware
│   ├── views/                  # FastHTML components/pages
│   ├── services/               # markdown parsing, rss, sitemap
│   ├── static/                 # css, icons, client js (minimal)
│   └── assets/                 # shared images
├── content/
│   ├── posts/                  # blog posts in folders
│   └── projects/               # project pages (optional)
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/                    # helper scripts (e.g., build feed)
├── pyproject.toml              # `uv` managed
├── uv.lock
├── .github/workflows/ci.yml
└── README.md
```

### V1 Scope (Implement Now)
- FastAPI + FastHTML app with pages: home, blog index, post detail
- Markdown content pipeline (frontmatter, code highlighting, basic shortcodes for charts)
- Altair/Plotly embedding inline; Marimo via iframe under `/apps/...`
- RSS feed (`/feed.xml`), sitemap, robots
- Minimal CSS with dark/light mode toggle
- Analytics: none in v1
- CI: ruff, mypy, pytest, coverage; deploy via Railway GitHub integration on `main`
- Basic tests: 3–5 unit, 2–3 integration

### Roadmap (Later)
- Tag pages and filters; site search (Lunr, small index)
- Comments via Giscus (GitHub Discussions)
- Image processing (thumbnails, responsive `srcset`), S3 offload
- OG image automation per post
- Add Umami analytics (self-host) with privacy notice
- Preview environments for PRs
- E2E tests via Playwright
- Theming and custom design system

### Open Questions / Decisions to Revisit
- Region selection on Railway
- When to add Umami (or consider Plausible/GA4 instead)
- Whether to enable preview envs for PRs
- If/when to add comments; choose Giscus if GitHub-centric

### Notes on Minimal JS
- Prefer server-rendered pages. Only ship vendor JS per page when charts are present. No SPA runtime.

---

## Explanations you asked for

### Markdown vs DB-backed CMS (summary)
- Markdown fits a code-first, git-based workflow with minimal infra and cost. A DB adds operational overhead but unlocks web editing, user content, and complex queries.

### RSS utility (summary)
- Enables readers/aggregators to subscribe, supports cross-post/import elsewhere, and improves distribution with negligible maintenance.

### Downsides of iframes (summary)
- Heavier than inline embeds, isolated styling, limited SEO for framed content, and cross-document messaging if you need interactions. They are ideal when isolation and simplicity outweigh these costs (e.g., live Marimo apps).

---

## Next Steps
1) Initialize repo with `uv`, FastAPI/FastHTML skeleton, and CI
2) Add Markdown parser, frontmatter schema, and sample posts
3) Implement Altair/Plotly embeds and Marimo iframe routes
4) Add RSS/sitemap and dark mode toggle
5) Set up Railway project and connect GitHub for deploy


