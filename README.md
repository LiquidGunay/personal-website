# personal-site

This repository now uses a React + Next.js frontend with a Python/FastAPI backend API and static hosting coordinator.

## Architecture

- React/Next.js app: `frontend/` (App Router, TypeScript)
- API + static coordinator: `app/main.py`
- Content: `content/posts/<slug>/index.md` and `content/pages/*.md`

## Content model

Homepage placeholder copy lives in `content/pages/home.md`; edit that file to replace the hero tagline,
background paragraph, current questions, four quotes, blog holding note, and coursework intro.

Posts use markdown frontmatter plus custom cell fences:

- `title`
- `slug`
- `date`
- `summary`
- `tags`
- `status` (`published` or `draft`)
- optional `hero`
- optional `series`

Custom blocks in post body:

- `python` code cells (rendered as text with collapsed details)
- `chart` cells (JSON payload rendered by deterministic chart components)
- `output` output snippets (captured logs/results)

Example:

````md
```python
print("hello")
```

```chart
{"type":"bar","title":"Signal","data":[{"x":"A","y":1}]}
```

```output
Result: 42
```
````

## Quick start

### Backend + API + editor

1. Install backend deps:
   - `uv sync --all-extras`
2. Start backend + editor + Next dev server:
   - `scripts/dev.sh`
3. Open:
   - FastAPI host: `http://127.0.0.1:8000`
   - Next frontend: `http://127.0.0.1:3000`
   - Coursework editor: `http://127.0.0.1:8001`

### Frontend-only

1. Install frontend deps:
   - `npm --prefix frontend install`
2. Run Next locally:
   - `npm --prefix frontend run dev`

## API

- `GET /api/posts`
- `GET /api/posts/{slug}`
- `GET /api/page/{slug}`
- `GET /api/coursework`

SEO/utility endpoints still served by FastAPI:

- `GET /feed.xml`
- `GET /robots.txt`
- `GET /sitemap.xml`
- `GET /llms.txt`

## Production flow

1. Install frontend deps and build:
   - `npm --prefix frontend install`
   - `npm --prefix frontend run build`
2. Start backend-only host:
   - `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`
3. Backend serves `frontend/out` for frontend routes (`/`, `/about`, `/blog`, `/coursework`) and keeps JSON APIs on `/api/*`.

## Validation

- Backend tests:
  - `uv run pytest`
- Frontend parser tests:
  - `npm --prefix frontend run parser:test`
- Visual checks:
  - `scripts/ui_screenshots.sh`

`scripts/ui_screenshots.sh` captures `/`, `/about`, `/blog`, a sample post, and `/coursework` at desktop/tablet/mobile sizes in light and dark mode.
