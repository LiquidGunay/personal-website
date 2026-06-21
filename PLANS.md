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
- Fixed production coursework regressions: removed global arbitrary word splitting from normal UI text and made the coursework D3 bootstrap retry until both the mount node and local D3 are available.
- Verified the fix with targeted Playwright delayed-D3 checks plus the 64-combination local route matrix; coursework rendered with no failures and max local ready time of 444ms.
- Added versioned coursework static asset URLs so production does not keep using cached `/static/coursework.js` or `/static/coursework.css` after chart/CSS fixes.
- Implemented the chosen Editorial Ledger plus Annotated Atlas chart direction: muted subject rules, paper-tone tiles, course-code-only SVG labels, flatter controls, and field-note details styling.
- Confirmed the `55201af` Railway auto-deploy initially failed on a transient-looking pip wheel hash mismatch during Nixpacks setup; retried with `railway redeploy --service web -y`, which succeeded with build cache skipped.
- Verified production now serves `coursework.css?v=20260611-4` and `coursework.js?v=20260611-4`; Playwright production smoke checks passed for `/`, `/blog`, and `/coursework/` across desktop, tablet, mobile, and 280px narrow viewports in light and dark modes.

## Homepage polish pass - 2026-06-20

- Started a polish pass to make the current site feel less unfinished while keeping copy editable by hand.
- Added `content/pages/home.md` as the single homepage copy surface with placeholder fields for the hero tagline, background paragraph, current questions, four quotes, blog holding note, and coursework intro.
- Removed blog links from the visible navigation/homepage/footer and changed `/blog` into a quiet holding page while preserving the route.
- Reduced blog discoverability in sitemap/LLM text while keeping coursework visible.

## Coursework transcript pass - 2026-06-20

- Updated coursework data from the provided transcript images rather than OCR alone: 63 courses across semesters 1-8, with the minor courses placed one each in semesters 3-7.
- Used official IITG public sources for course names, credits, minor semester sequence, and syllabus-derived descriptions where available; DA 671 uses a concise standard reinforcement-learning summary because a public IITG syllabus page was not found.
- Changed coursework filters/details from inferred year labels to explicit semester labels, and added credit metadata to the details panel.
- Verified with `npm --prefix frontend run typecheck`, `TMPDIR=/tmp /home/ubuntu/.local/bin/uv run pytest -q`, `npm --prefix frontend run build`, `PATH=/home/ubuntu/.local/bin:$PATH TMPDIR=/tmp scripts/ui_screenshots.sh`, and a mobile Playwright tile-click smoke test.
- Replaced DA 671 with the user-provided reinforcement-learning description.
- Removed the explicit homepage coursework CTA while keeping coursework in the normal navigation/footer.
- Added a persistent light/dark theme toggle in the shared Next shell and a pre-paint theme init script.
- Reworked the coursework chart away from the old uniform tile helper into a filled D3 treemap with stronger light/dark contrast, immediate no-fade rendering, and cache-busted assets at `20260620-5`.
- Re-verified with `npm --prefix frontend run typecheck`, `TMPDIR=/tmp /home/ubuntu/.local/bin/uv run pytest -q`, `npm --prefix frontend run build`, focused Playwright checks for theme persistence/DA671/mobile overflow/63 tiles, and refreshed coursework screenshots.
- Integrated the subagent audit: moved the treemap above search/semester controls, tightened coursework hero spacing, added mobile scroll-to-details after tile selection, loosened small mobile labels, bumped coursework assets to `20260620-6`, and confirmed the chart now starts at about 478px on desktop and 427px on mobile.
- Deployed to Railway production `web` as deployment `1981bf77-f58c-4886-9f4e-83572ec22bfd`; production verification on `https://gunayintheory.com` confirmed `coursework.js?v=20260620-6`, 63 coursework tiles, no home CTA, no horizontal overflow, theme persistence, and DA 671 detail text.
- Fixed live coursework map loading by replacing Next Script queue usage with direct deferred D3/coursework scripts, adding a local D3 fallback loader, and bumping coursework assets to `20260620-7`; local build, typecheck, pytest, and Playwright tile wait passed before deploy.
- Deployed the coursework map loading fix to Railway production as deployment `5350df8f-6f0b-4680-be77-b65de6cacca5`; live verification on `https://gunayintheory.com/coursework/` confirmed direct deferred `d3.v7.min.js?v=20260620-7` and `coursework.js?v=20260620-7`, 63 rendered tiles, no horizontal overflow, no browser console/page errors, and 200 OK static asset responses.
- Fixed the Git-deployed coursework map regression caused by plain script tags not executing on Next client-side navigation; added `CourseworkAssets` client loader, exposed `window.initCourseworkMap`, bumped coursework assets to `20260621-1`, and verified both direct `/coursework/` loads and Home -> Coursework navigation render 63 tiles locally.
- Refined the coursework and theme-toggle palette so dark mode uses warmer neutral surfaces instead of blue-slate chart framing, while light-mode filter buttons use quieter green-tinted active states; bumped coursework assets to `20260621-2` and verified typecheck, build, pytest, focused Playwright checks, and the full screenshot matrix locally.
- Removed the coursework tile-label stroke/halo so light-mode course codes sit directly on each tile fill instead of showing the page background around the letters; bumped coursework assets to `20260621-3`.
- Removed About as a standalone public page, tightened mobile header chrome, revised the homepage visual treatment toward a quieter editorial signal, and started a mobile-first coursework interaction pass with tap-selected details and a readable mobile course list.
