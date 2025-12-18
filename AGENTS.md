# Personal Site – Agent Guidelines

These rules exist to keep the site **responsive**, **accessible**, and **easy to verify** after changes.

## Responsive + Layout Rules

- Prefer **fluid layout primitives**: `max-width`, `min()`, `max()`, `clamp()`, CSS Grid/Flexbox. Avoid fixed pixel widths/heights unless guarded by `clamp()` or media queries.
- Keep **line length readable** on desktop (roughly 60–80ch for prose) and avoid accidental horizontal scrolling:
  - Use `overflow-wrap:anywhere` for content areas.
  - Ensure media elements (`img`, `svg`, `video`) are `max-width:100%` with `height:auto`.
- Treat mobile as first-class:
  - Tap targets ≥ ~44px, no hover-only interactions.
  - Components should stack cleanly at ~`< 980px` and still look good at ~`390×844`.
- For “wide” pages, use `body_class="wide …"` and page-scoped styles (like `app/static/coursework.css`) instead of polluting `app/static/base.css`.

## Coursework Visualization Rules

- The `/coursework` page uses a **D3 treemap** (not the old sunburst) with:
  - Legend filtering by subject.
  - Click-to-pin details in a side panel (stages + prerequisite links).
  - A `noscript` fallback list.
- Don’t rely on dense labels inside the chart. Use **progressive disclosure**:
  - Keep tile labels short (codes); full names + metadata go in the details panel/tooltip.
- Must remain responsive:
  - Re-render on container resize (`ResizeObserver`) and avoid hard-coded SVG sizes.

## Testing Strategy (Required)

### Quick manual loop

1) Start the server: `uv run uvicorn app.main:app --reload`
2) Verify the three core pages in **light and dark**:
   - `/`
   - `/blog`
   - `/coursework`

### Repeatable screenshots (recommended)

- Run: `scripts/ui_screenshots.sh`
- Output: `artifacts/playwright/*.png` (ignored by git)
- Viewports covered:
  - `1280×800` (desktop)
  - `768×1024` (tablet)
  - `390×844` (mobile)

### Using Playwright MCP (for visual checks inside Codex)

- Host locally (same as above) and take screenshots after changes:
  - Resize to each viewport, navigate to each route, then screenshot full page.
- If CSS/JS in `app/static/` changed, restart the server to refresh cache-busting digests (the `static_url()` helper is cached).

