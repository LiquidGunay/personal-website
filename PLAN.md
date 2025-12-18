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

## Implementation Status (v1)

- [x] Routes: `/` (About), `/blog`, `/blog/<slug>`, `/coursework`, `/feed.xml`
- [x] Blog index: combined index+archive with year grouping and tag chips
- [x] About page: featured post link (frontmatter), quotes slider (autoplay, nav, tile)
- [x] Theme: server-side cookie toggle, `<html data-theme="...">`, CSS variables
- [x] Baseline CSS: typography, spacing, tile, nav; Pygments injection
- [x] Content pipeline: Markdown + frontmatter for posts and pages
- [x] Tests: integration coverage for routes, RSS, quotes, theme; pre-push hook
- [x] Coursework visualization (D3 treemap + details panel + no-JS fallback list)
- [x] Visual regression snapshots script (`scripts/ui_screenshots.sh`)
- [ ] Coursework data model (`content/coursework/data.yaml`) + generator for `app/static/courses.json`
- [ ] About: real content (avatar asset, quotes list, featured post selection)
- [ ] Blog: optional tag filter UX (progressive enhancement)
- [ ] SEO polish (OG images automation, canonical review)
- [ ] Analytics (later: Umami/Plausible per PLAN)

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

## Next Tasks

1) (Optional) Move coursework source-of-truth to `content/coursework/data.yaml` and generate `app/static/courses.json`
2) Enrich coursework metadata (term/year/credits) and surface it in the details panel
3) Fill About content (avatar, finalized quotes, featured post)
4) Optional tag filter behavior on `/blog` (progressive enhancement)
5) SEO polish and later analytics integration (per hosting/privacy preference)

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
- **E2E/Visual (optional)**:
  - Use `scripts/ui_screenshots.sh` for screenshot-based UI checks (light/dark + common viewports).
  - Use Playwright against a built container to validate critical flows (home, blog index, post page, feed). Run locally or nightly to avoid CI cost/time.
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

### Coursework Page (`/coursework`)
- Current: a responsive D3 treemap (subject legend + click-to-pin details panel) with a `noscript` fallback list.
- Data: currently served from `app/static/courses.json`; prerequisites and “plan stages” are rendered in the details panel.
- Next: optionally move the source-of-truth into `content/coursework/data.yaml` and generate the JSON during builds.

### Open Questions / Decisions to Revisit
- Region selection on Railway
- When to add Umami (or consider Plausible/GA4 instead)
- Whether to enable preview envs for PRs
- If/when to add comments; choose Giscus if GitHub-centric

### Notes on Minimal JS
- Prefer server-rendered pages. Only ship vendor JS per page when charts are present. No SPA runtime.

---

## Next Steps
1) Initialize repo with `uv`, FastAPI/FastHTML skeleton, and CI
2) Add Markdown parser, frontmatter schema, and sample posts
3) Implement Altair/Plotly embeds and Marimo iframe routes
4) Add RSS/sitemap and dark mode toggle
5) Set up Railway project and connect GitHub for deploy

## UI Plan (ui_plan)

Design inspiration: clean, content-first aesthetic similar to Lilian Weng’s Lil’Log (PaperMod-like spacing/typography, narrow readable column, subtle accents). See reference: [Lil’Log](https://lilianweng.github.io/).

### Navigation and Pages
- Top nav tabs: About, Blog, Coursework. No separate “Posts” vs “Archive”.
- Routes:
  - `/` → About (landing page)
  - `/blog` → Blog index + archive combined (year-grouped list; optional tag chips; pagination)
  - `/blog/<slug>` → Post detail
  - `/coursework` → Coursework visualization page
  - Keep: `/feed.xml`, `/sitemap.xml`, `/robots.txt`; optional `/tags/<tag>` later
- Mobile nav: simple disclosure menu; sticky header.
- Brand: text wordmark; no logo for now.

### Look & Feel
- Layout: single column, ~740px content width; ample whitespace; strong vertical rhythm.
- Typography: match Lil’Log (Inter), fallback to system stack; keep configurable via CSS var; readable monospace; 1.6–1.8 line-height.
- Color: neutral grays + a single accent (blue/indigo). Default theme follows system (prefers-color-scheme); theme toggle available.
- Components: subtle borders, focus/hover states; accessible skip-link.

### FastHTML Architecture
- `app/views/layout.py`: BaseLayout (head, meta, header/nav, footer, theme toggle)
- `app/views/components.py`: NavBar, Footer, PostCard, TagPill, Paginator, Hero, Section, Callout, ThemeToggle
- `app/views/pages_about.py`: AboutPage
- `app/views/pages_blog.py`: BlogIndexPage, PostPage
- `app/views/pages_coursework.py`: CourseworkPage
- Wire routes in `app/main.py`; content via `app/services/content.py`.

### Blog Index (Posts + Archive on one page)
- Hero/intro at top with short tagline and RSS link.
- Recent posts list grouped by year; “Older posts” anchor scrolls to archive section on same page.
- Optional tag filter chips (progressive enhancement, no heavy JS).

### About Page (Landing `/`)
- Hero with avatar, name, one-liner.
- Planned elements: QuoteCarousel (rotating favorite quotes), FeaturedPostLink, optional Chatbot placeholder (flagged off by default). Content TBD for now.
- Source from `content/pages/about.md` (Markdown) rendered through the existing pipeline; allow small inline components like Callout.

### Coursework Page (`/coursework`)
- Current: a treemap-style course map (D3) with a details panel and subject filtering. It stays readable on mobile by using short tile labels + progressive disclosure.
- Future options (if we want richer views):
  - Treemap by subject sized by credits/hours (instead of equal tiles)
  - Timeline/swimlanes by term/year
  - Prerequisite graph for a selected subject (separate view)

### UI Libraries and Assets
- Baseline CSS: either tiny classless CSS (e.g., Pico.css) or Open Props tokens + ~100 lines of custom CSS in `app/static/base.css` to achieve PaperMod-like spacing/typography.
- Icons: Tabler Icons (inline SVGs) for nav and UI glyphs.
- Syntax highlighting: Pygments styles mapped to light/dark themes.

### Accessibility & Performance
- Color contrast AA/AAA where feasible; visible focus states; skip-links; semantic landmarks.
- Ship zero JS by default; load D3 only on `/coursework`.
- Images `loading="lazy"`, width/height set; responsive typography; avoid heavy webfonts unless necessary.

### SEO & Meta
- Per-page titles and descriptions; OpenGraph/Twitter images; canonical URLs; `noindex` for drafts.

### Content Authoring
- Posts at `content/posts/<slug>/index.md` (unchanged).
- About at `content/pages/about.md`.
- Coursework data currently at `app/static/courses.json` (optional future move to `content/coursework/data.yaml`).

### Implementation Steps
1) Create FastHTML components/pages listed above; wire routes in `app/main.py`.
2) Establish baseline CSS and theme toggle in `app/static/base.css`.
3) Build `/blog` with year grouping and optional tag chips; keep archive on same page.
4) Render `/` from `about.md` with hero and planned sections (placeholders).
5) Add `/coursework` shell and capture visualization ideas; defer charts to later.

### Open Questions
- Accent color preference?
- About: provide avatar asset and 3–5 quotes; which featured post to link? Any chatbot vendor/approach if/when we add it?
- Coursework: confirm preferred visualization direction and data source format.
- Logo: none for now (revisit later if branding changes).

