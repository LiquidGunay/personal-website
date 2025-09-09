## Personal Site (FastAPI + FastHTML)

### Quick start
1. Install `uv` and Python 3.12.
2. Create env and install deps:
   - Local (recommended): `uv sync --all-extras`
   - Railway build uses `requirements.txt` automatically
3. Run locally:
   - `uv run uvicorn app.main:app --reload`

### Deploy (Railway)
- Connect the GitHub repo in Railway.
- Set the start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Ensure `PYTHON_VERSION=3.12` (Railway) and `ENV=production`.

### Content
- Write posts in `content/posts/<slug>/index.md` with frontmatter.

### Tests
- `uv run pytest`


