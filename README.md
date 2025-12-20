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

### Deploy (Railway)
- Connect the GitHub repo in Railway (Services → New → Deploy from GitHub).
- Build: Railway auto-detects Python and runs `pip install -r requirements.txt` if present, but we use uv at runtime for local dev. No Docker needed.
- Start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment:
  - `PYTHON_VERSION=3.12`
  - `ENV=production`
  - Optional: `BASE_URL=https://yourdomain`

### Content
- Write posts in `content/posts/<slug>/index.md` with frontmatter.

### Tests
- `uv run pytest`

### Git hooks (pre-push)
- Enable repo-local hooks so tests run before pushing:
  - `git config core.hooksPath .githooks`
  - Ensure executable: `chmod +x .githooks/pre-push scripts/prepush.sh`
- The pre-push hook:
  - Blocks on `pytest` failures
  - Runs `ruff` and `mypy` in warn-only mode

