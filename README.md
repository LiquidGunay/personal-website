## Personal Site (FastAPI + FastHTML)

### Quick start
1. Install `uv` and Python 3.12.
2. Create env and install deps:
   - `uv sync --all-extras`
3. Run locally:
   - `uv run uvicorn app.main:app --reload`

### Coursework data entry UI (local-only)
- Start both the site + editor:
  - `scripts/dev.sh`
- Or run just the editor on a separate port:
  - `uv run uvicorn scripts.coursework_editor:app --reload --port 8001`
- Editor URL: `http://127.0.0.1:8001` (writes to `app/static/courses.json`)

### Coursework map behavior (`/coursework`)
- D3 treemap with subject legend focus, click-to-pin details, and `noscript` fallback.
- Modern controls:
  - text search by code/name/topic
  - year chip filters
  - live visible-course count summary
- Responsive and accessible interactions:
  - keyboard-selectable tiles
  - focus/hover tooltip parity
  - explicit empty-state message when filters return no matches

### Deploy (Railway)
- Connect the GitHub repo in Railway (Services → New → Deploy from GitHub).
- Build: Railway auto-detects Python and runs `pip install -r requirements.txt` if present, but we use uv at runtime for local dev. No Docker needed.
- Start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment:
  - `PYTHON_VERSION=3.12`
  - `ENV=production`
  - `BASE_URL=https://gunayintheory.com` (canonical host)
  - Optional: `SITE_TITLE`, `SITE_DESCRIPTION`, `AUTHOR_NAME`, `AUTHOR_ROLE`, `DEFAULT_OG_IMAGE`

### Content
- Write posts in `content/posts/<slug>/index.md` with frontmatter.
- Optional SEO frontmatter keys:
  - `seo_title`
  - `seo_description`
  - `og_image`
  - `canonical_path`

### SEO + Crawlers
- Public endpoints:
  - `/feed.xml`
  - `/robots.txt`
  - `/sitemap.xml`
  - `/llms.txt`
- Canonical URLs and social metadata are rendered server-side from site config.

### Tests
- `uv run pytest`

### Repo-local Skills
- `./.codex/skills/personal-site-testing`
  - Functional + visual + responsive QA workflow for this repo
- `./.codex/skills/marimo-notebook-testing`
  - marimo notebook + WASM + Vega/Altair performance validation workflow

### Git hooks (pre-push)
- Enable repo-local hooks so tests run before pushing:
  - `git config core.hooksPath .githooks`
  - Ensure executable: `chmod +x .githooks/pre-push scripts/prepush.sh`
- The pre-push hook:
  - Blocks on `pytest` failures
  - Runs `ruff` and `mypy` in warn-only mode
