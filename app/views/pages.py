from __future__ import annotations

import hashlib
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from collections.abc import Iterable
from html import escape

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
    page: Page | None = None
    page_meta: dict[str, object]
    try:
        from ..services.content import get_page

        page = get_page("about")
    except Exception:
        page = None
    page_meta = dict(page.meta or {}) if page else {}

    quotes_list: list[str] = []
    if page and getattr(page, "quotes", None):
        quotes_list = [str(q) for q in page.quotes or []]
    if not quotes_list:
        quotes_list = [
            "Make it work, make it right, make it fast.",
            "Simplicity is prerequisite for reliability.",
            "Programs must be written for people to read.",
        ]
    quotes_block = ""
    if quotes_list:
        quote_items = "".join(
            f"<li><blockquote>&ldquo;{escape(str(q))}&rdquo;</blockquote></li>" for q in quotes_list
        )
        quotes_block = (
            "<div class=\"about-card about-quotes\">"
            "<h2>Favorite notes</h2>"
            f"<ul class=\"quote-list\">{quote_items}</ul>"
            "</div>"
        )

    featured = None
    if page and getattr(page, "featured_slug", None):
        try:
            from ..services.content import get_post_by_slug

            featured = get_post_by_slug(page.featured_slug)  # type: ignore[arg-type]
        except Exception:
            featured = None
    if featured is None:
        featured = next(iter(list_posts(limit=1)), None)
    featured_block = ""
    if featured:
        featured_block = (
            f"<a class=\"about-card about-featured\" href=\"/blog/{escape(featured.slug)}\">"
            "<span class=\"card-eyebrow\">Featured writing</span>"
            f"<span class=\"card-title\">{escape(featured.title)}</span>"
            "<span class=\"card-cta\">Read the post →</span>"
            "</a>"
        )

    links_block = ""
    links_data = page_meta.get("links") if isinstance(page_meta.get("links"), list) else []
    contact_items: list[str] = []
    for item in links_data or []:
        if not isinstance(item, dict):
            continue
        label_raw = item.get("label") or item.get("name") or item.get("title")
        url_raw = item.get("url")
        note_raw = item.get("note") or item.get("description")
        if not label_raw or not url_raw:
            continue
        label = escape(str(label_raw))
        url = escape(str(url_raw), quote=True)
        note = escape(str(note_raw)) if note_raw else ""
        note_span = f"<span class=\"about-link-note\">{note}</span>" if note else ""
        contact_items.append(
            f"<li><a href=\"{url}\">{label}</a>{note_span}</li>"
        )
    if contact_items:
        links_block = (
            "<div class=\"about-card about-links\">"
            "<h2>Connect</h2>"
            f"<ul>{''.join(contact_items)}</ul>"
            "</div>"
        )

    hero_title_raw = page_meta.get("hero_title") or (page.title if page else None) or "About"
    hero_title = escape(str(hero_title_raw))
    hero_tagline_raw = page_meta.get("hero_tagline") or page_meta.get("tagline")
    hero_tagline = escape(str(hero_tagline_raw)) if hero_tagline_raw else ""
    location = page_meta.get("location")
    location_html = (
        f"<p class=\"about-location\">{escape(str(location))}</p>" if location else ""
    )

    body_md = page.html if page else "<p>Welcome! Content coming soon.</p>"

    body = f"""
    <section class=\"about-layout\">
      <aside class=\"about-sidebar\">
        <figure class=\"about-photo\">
          <img src=\"{static_url('about-portrait.png')}\" alt=\"Portrait of the site owner\" width=\"864\" height=\"1098\" loading=\"lazy\" />
        </figure>
        {location_html}
        {featured_block}
        {links_block}
        {quotes_block}
      </aside>
      <article class=\"about-content\">
        <header class=\"about-header\">
          <p class=\"about-eyebrow\">About</p>
          <h1>{hero_title}</h1>
          {f'<p class="about-tagline">{hero_tagline}</p>' if hero_tagline else ''}
        </header>
        <div class=\"about-body\">{body_md}</div>
      </article>
    </section>
    """
    return _layout(
        "About",
        body,
        theme=theme,
        current_path=current_path,
        body_class="wide about-page",
    )


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
