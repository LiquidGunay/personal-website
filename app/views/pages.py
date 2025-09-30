from __future__ import annotations

import hashlib
from collections.abc import Iterable
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from ..services.content import Page, Post, list_posts, syntax_highlight_css

_STATIC_ROOT = Path(__file__).resolve().parent.parent / "static"


@lru_cache(maxsize=None)
def static_url(path: str) -> str:
    file_path = _STATIC_ROOT / path
    try:
        digest = hashlib.sha1(file_path.read_bytes()).hexdigest()[:12]
    except FileNotFoundError:
        return f"/static/{path}"
    return f"/static/{path}?v={digest}"


def _layout(
    title: str,
    body: str,
    theme: str | None = None,
    current_path: str = "/",
    *,
    body_class: str = "",
    extra_head: str = "",
) -> str:
    theme_attr = f" data-theme=\"{theme}\"" if theme else ""
    class_attr = f" class=\"{body_class}\"" if body_class else ""
    return f"""
<!doctype html>
<html lang=\"en\"{theme_attr}>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <link rel=\"stylesheet\" href=\"{static_url('base.css')}\" />
    {extra_head}
    <style>{syntax_highlight_css()}</style>
  </head>
  <body{class_attr}>
    <header>
      <nav>
        <a href=\"/\">About</a>
        <a href=\"/blog\">Blog</a>
        <a href=\"/coursework\">Coursework</a>
        <a id=\"theme-toggle\" aria-label=\"Toggle theme\" href=\"/toggle-theme?next={current_path}\">🌓</a>
      </nav>
    </header>
    <main id=\"content\">
      {body}
    </main>
    <footer>
      <small>© {datetime.now().year}</small>
    </footer>
  </body>
</html>
"""


def render_home_page(posts: Iterable[Post], theme: str | None = None, current_path: str = "/") -> str:
    items = "\n".join(
        (
            f"<li><a href=\"/blog/{p.slug}\">{p.title}</a> "
            f"<time datetime=\"{p.date.isoformat()}\">{p.date.date()}</time></li>"
        )
        for p in posts
    )
    body = f"""
    <section>
      <h1>Welcome</h1>
      <p>Latest posts:</p>
      <ul>{items}</ul>
    </section>
    """
    return _layout("Home", body, theme=theme, current_path=current_path)


def render_about_page(theme: str | None = None, current_path: str = "/") -> str:
    # Try to load a markdown page if provided later
    page: Page | None = None
    try:
        from ..services.content import get_page

        page = get_page("about")
    except Exception:
        page = None

    # Build quotes HTML from frontmatter, fallback to defaults
    quotes_list: list[str] = []
    if page and getattr(page, "quotes", None):
        quotes_list = [str(q) for q in (page.quotes or [])]
    if not quotes_list:
        quotes_list = [
            "Make it work, make it right, make it fast.",
            "Simplicity is prerequisite for reliability.",
            "Programs must be written for people to read.",
        ]
    _slides: list[str] = []
    for _q in quotes_list:
        _slides.append(f"<div class=\"quote-slide\"><blockquote>“{_q}”</blockquote></div>")
    quotes_html = (
        "<div class=\"quote-tile\">"
        + "<button class=\"quote-nav prev\" aria-label=\"Previous quote\">‹</button>"
        + f"<div class=\"quote-track\">{''.join(_slides)}</div>"
        + "<button class=\"quote-nav next\" aria-label=\"Next quote\">›</button>"
        + "</div>"
    )

    # Featured: prefer frontmatter featured_slug; fallback to latest
    featured = None
    if page and getattr(page, "featured_slug", None):
        try:
            from ..services.content import get_post_by_slug

            featured = get_post_by_slug(page.featured_slug)  # type: ignore[arg-type]
        except Exception:
            featured = None
    if featured is None:
        featured = next(iter(list_posts(limit=1)), None)
    featured_html = (
        f'<a class="featured" href="/blog/{featured.slug}">Featured: {featured.title}</a>'
        if featured
        else ""
    )
    body_md = page.html if page else "<p>Welcome! Content coming soon.</p>"
    body = f"""
    <section class=\"hero\"> 
      <div class=\"avatar\" aria-hidden=\"true\"></div>
      <div>
        <h1>About</h1>
        {featured_html}
      </div>
    </section>
    <section>
      <div class=\"quotes\">{quotes_html}</div>
      {body_md}
    </section>
    <script>
      (function(){{
        var tile = document.querySelector('.quote-tile');
        if(!tile) return;
        var track = tile.querySelector('.quote-track');
        var slides = tile.querySelectorAll('.quote-slide');
        var idx = 0;
        function go(n){{
          idx = (n + slides.length) % slides.length;
          track.style.transform = 'translateX(' + (-idx * 100) + '%)';
        }}
        var timer = setInterval(function(){{ go(idx+1); }}, 6000);
        tile.addEventListener('mouseenter', function(){{ clearInterval(timer); }});
        tile.addEventListener('mouseleave', function(){{ timer = setInterval(function(){{ go(idx+1); }}, 6000); }});
        var prev = tile.querySelector('.quote-nav.prev');
        var next = tile.querySelector('.quote-nav.next');
        if (prev) prev.addEventListener('click', function(){{ go(idx-1); }});
        if (next) next.addEventListener('click', function(){{ go(idx+1); }});
        track.style.width = (slides.length * 100) + '%';
        go(0);
      }})();
    </script>
    """
    return _layout("About", body, theme=theme, current_path=current_path)


def render_blog_index_page(posts: Iterable[Post], theme: str | None = None, current_path: str = "/") -> str:
    # Group by year
    groups: dict[int, list[Post]] = {}
    for p in posts:
        groups.setdefault(p.date.year, []).append(p)
    years = sorted(groups.keys(), reverse=True)
    sections: list[str] = []
    for y in years:
        year_items = "\n".join(
            (
                f"<li><a href=\"/blog/{p.slug}\">{p.title}</a> "
                f"<time datetime=\"{p.date.isoformat()}\">{p.date.date()}</time>"
                + (" — " + " ".join(f"<span class=tag>#{t}</span>" for t in p.tags) if p.tags else "")
                + "</li>"
            )
            for p in groups[y]
        )
        sections.append(f"<h2>{y}</h2><ul>{year_items}</ul>")
    rss = '<a class="rss" href="/feed.xml">RSS</a>'
    body = f"""
    <section>
      <h1>Blog</h1>
      <p>{rss}</p>
      {''.join(sections)}
    </section>
    """
    return _layout("Blog", body, theme=theme, current_path=current_path)


def render_post_page(post: Post, theme: str | None = None, current_path: str = "/") -> str:
    body = f"""
    <article>
      <h1>{post.title}</h1>
      <time datetime=\"{post.date.isoformat()}\">{post.date.date()}</time>
      <div class=\"post\">{post.html}</div>
    </article>
    """
    return _layout(post.title, body, theme=theme, current_path=current_path)


def render_coursework_page(theme: str | None = None, current_path: str = "/") -> str:
    coursework_js = static_url("coursework.js")
    coursework_css = static_url("coursework.css")
    body = f"""
    <section>
      <h1>Coursework</h1>
      <p>A zoomable radial map showing how every course connects back to its parent field. Click a branch to dive into the cluster, or click the background to reset.</p>
      <div id=\"cw-viz\" class=\"cw\" aria-label=\"Interactive radial coursework map\">
        <figure>
          <figcaption>
            <h2>Radial tree of clusters</h2>
            <p>Each top level branch represents Physics, Electronics, Mathematics, Computer Science, Economics, or Other courses. Zoom in to follow the breakdown from field → sub-field → individual module.</p>
          </figcaption>
          <div class=\"viz-canvas\" data-viz=\"radial\" aria-label=\"Radial coursework tree\"></div>
        </figure>
      </div>
      <noscript>
        <p><strong>Note:</strong> This visualization requires JavaScript. Below is a plain list as fallback.</p>
        <div id=\"cw-fallback\"></div>
      </noscript>
    </section>
    <script src=\"https://cdn.jsdelivr.net/npm/d3@7\"></script>
    <script src=\"{coursework_js}\"></script>
    """
    return _layout(
        "Coursework",
        body,
        theme=theme,
        current_path=current_path,
        body_class="wide",
        extra_head=f'<link rel="stylesheet" href="{coursework_css}" />',
    )
