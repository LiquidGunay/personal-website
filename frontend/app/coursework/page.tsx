import Script from "next/script";

export default function CourseworkPage() {
  return (
    <section className="coursework-shell">
      <header>
        <p className="eyebrow">Academic map</p>
        <h1>Coursework</h1>
        <p>An interactive treemap of modules and tracks with progressive filters and details.</p>
      </header>

      <div id="cw-viz" className="cw">
        <div className="cw-layout">
          <figure className="cw-figure">
            <figcaption className="cw-caption">
              <div className="cw-caption-text">
                <h2>Course map</h2>
                <p>Subjects, tracks, and years update together while filtering.</p>
              </div>
              <div className="cw-legend" data-cw-legend aria-label="Subject legend" />
            </figcaption>
            <div className="cw-toolbar" aria-label="Coursework controls">
              <label className="cw-search" htmlFor="cw-search-input">
                <span>Find a module</span>
                <input
                  id="cw-search-input"
                  type="search"
                  data-cw-search
                  placeholder="Search by code, title, or topic"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="cw-year-chips" data-cw-years aria-label="Year filters" />
              <p className="cw-stats" data-cw-stats>
                Loading course index…
              </p>
            </div>
            <div className="viz-canvas" data-viz="treemap" aria-label="Coursework treemap" />
          </figure>

          <aside className="cw-details" aria-label="Course details">
            <div className="cw-details-card">
              <div className="cw-details-header">
                <h2>Details</h2>
                <button type="button" className="cw-details-clear" data-cw-clear hidden>
                  Clear
                </button>
              </div>
              <div className="cw-details-body" data-cw-details>
                <p className="cw-details-empty">Select a tile to see year and details.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <noscript>
        <p>
          <strong>Note:</strong> This visualization requires JavaScript. A plain list fallback appears below.
        </p>
        <div id="cw-fallback" />
      </noscript>

      <link rel="stylesheet" href="/static/coursework.css" />
      <Script src="https://cdn.jsdelivr.net/npm/d3@7" strategy="beforeInteractive" />
      <Script src="/static/coursework.js" strategy="afterInteractive" />
    </section>
  );
}

