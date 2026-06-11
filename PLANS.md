# Plans

## Design direction update - 2026-06-11

- Homepage direction: combine the "Editorial Field Notes" mockup with restrained "Visual Garden" texture. Keep the home page text-forward, readable, and personal rather than turning it into a portfolio dashboard.
- Front page scope: remove coursework from the homepage. Coursework should not appear as a homepage module or supporting widget.
- Coursework page direction: use the "Editorial Coursework Atlas" mockup as the target for `/coursework`.
- Coursework interaction model: keep the D3 treemap as the primary visualization, with subject legend filtering, short course-code tile labels, and progressive disclosure through a selected-course details panel.
- Coursework supporting content: keep chronological/year grouping below the visualization for scanning and accessibility.
- Mobile coursework behavior: use a compact view toggle, horizontal subject filters, responsive treemap, and a bottom-sheet style course details panel.
- Deferred idea: the concept-map/research-atlas direction is only worth revisiting after there are enough blog posts, notes, or prerequisite/topic relationships to make graph navigation useful.

Reference mockups generated during planning and copied into the repo:

- Homepage base direction, "Editorial Field Notes": `artifacts/design-concepts/homepage-editorial-field-notes.png`
- Homepage texture reference, "Visual Garden": `artifacts/design-concepts/homepage-visual-garden-texture.png`
- Coursework target direction, "Editorial Coursework Atlas": `artifacts/design-concepts/coursework-editorial-atlas.png`
- Coursework mobile behavior reference: `artifacts/design-concepts/coursework-mobile-atlas.png`

## Implementation progress - 2026-06-11

- Removed old SVG concept references from `artifacts/design-concepts`; retained only the selected PNG mockups.
- Started the UI execution pass in the Next frontend.
- Updated the homepage toward the Editorial Field Notes direction with restrained garden-style annotation, no coursework module, and a text-first latest-writing list.
- Updated `/coursework` toward the Editorial Coursework Atlas direction with summary stats, interactive treemap framing, selected-course details, and a server-rendered chronological course index.
- Updated global and coursework-specific styles toward a sharper editorial paper system with thin rules, less rounded card styling, stronger typography, and responsive list layouts.
- Hardened `/coursework` for odd and very narrow windows: local D3 vendor asset, capped hero type, responsive treemap height, horizontally scrollable filters on tiny screens, and 44px tap targets for skip/filter/search controls.
- Verified the final pass with a 64-combination Playwright matrix across `/`, `/blog`, `/coursework`, and `/about` in light/dark at 280, 320, 390, landscape, tablet, desktop, and wide desktop widths; no overflow or tap-target failures remained locally.
- Re-ran `npm --prefix frontend run typecheck`, `TMPDIR=/tmp uv run pytest -q`, and `TMPDIR=/tmp scripts/ui_screenshots.sh`; all passed.
