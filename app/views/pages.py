from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from datetime import datetime
from functools import lru_cache
from html import escape
from pathlib import Path

from ..services.content import Page, Post, list_posts, syntax_highlight_css
from ..services.site_config import SiteConfig, get_site_config

_STATIC_ROOT = Path(__file__).resolve().parent.parent / "static"


@lru_cache(maxsize=None)
def static_url(path: str) -> str:
    file_path = _STATIC_ROOT / path
    try:
        digest = hashlib.sha1(file_path.read_bytes()).hexdigest()[:12]
    except FileNotFoundError:
        return f"/static/{path}"
    return f"/static/{path}?v={digest}"


def _is_active(path: str, current_path: str) -> bool:
    if path == "/":
        return current_path == "/"
    return current_path == path or current_path.startswith(f"{path}/")


def _nav_link(path: str, label: str, current_path: str) -> str:
    active = " aria-current=\"page\"" if _is_active(path, current_path) else ""
    return f'<a href="{path}"{active}>{label}</a>'


def _meta_title(value: str, cfg: SiteConfig) -> str:
    if cfg.author_name.lower() in value.lower():
        return value
    return f"{value} | {cfg.author_name}"


def _to_json_ld(value: dict[str, object] | list[dict[str, object]] | None) -> str:
    if value is None:
        return ""
    payload = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    return f'<script type="application/ld+json">{payload}</script>'


def _layout(
    *,
    meta: dict[str, object],
    body: str,
    theme: str | None = None,
    current_path: str = "/",
    body_class: str = "",
    extra_head: str = "",
) -> str:
    cfg = get_site_config()
    title = escape(str(meta.get("title", cfg.site_title)))
    description = escape(str(meta.get("description", cfg.site_description)))
    canonical_path = str(meta.get("canonical_path", current_path))
    canonical_url = cfg.canonical_url(canonical_path)
    og_type = escape(str(meta.get("og_type", "website")))
    og_image_raw = str(meta.get("og_image", cfg.default_og_image))
    og_image = cfg.canonical_url(og_image_raw)
    twitter_card = "summary_large_image" if og_image_raw else "summary"
    json_ld = _to_json_ld(meta.get("json_ld"))
    robots = "noindex, nofollow" if bool(meta.get("noindex")) else "index, follow"

    theme_attr = f' data-theme="{escape(theme)}"' if theme else ""
    class_attr = f' class="{escape(body_class)}"' if body_class else ""
    brand = escape(cfg.author_name)

    return f"""
<!doctype html>
<html lang=\"en\"{theme_attr}>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <meta name=\"description\" content=\"{description}\" />
    <meta name=\"robots\" content=\"{robots}\" />
    <link rel=\"canonical\" href=\"{escape(canonical_url)}\" />
    <meta property=\"og:site_name\" content=\"{escape(cfg.site_title)}\" />
    <meta property=\"og:type\" content=\"{og_type}\" />
    <meta property=\"og:title\" content=\"{title}\" />
    <meta property=\"og:description\" content=\"{description}\" />
    <meta property=\"og:url\" content=\"{escape(canonical_url)}\" />
    <meta property=\"og:image\" content=\"{escape(og_image)}\" />
    <meta name=\"twitter:card\" content=\"{twitter_card}\" />
    <meta name=\"twitter:title\" content=\"{title}\" />
    <meta name=\"twitter:description\" content=\"{description}\" />
    <meta name=\"twitter:image\" content=\"{escape(og_image)}\" />
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    <link href=\"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap\" rel=\"stylesheet\" />
    <link rel=\"stylesheet\" href=\"{static_url('base.css')}\" />
    {extra_head}
    <style>{syntax_highlight_css()}</style>
    {json_ld}
  </head>
  <body{class_attr}>
    <a class=\"skip-link\" href=\"#content\">Skip to content</a>
    <header class=\"site-header\">
      <div class=\"nav-shell\">
        <a class=\"site-brand\" href=\"/\">{brand}</a>
        <nav class=\"site-nav\" aria-label=\"Main\">
          {_nav_link('/', 'About', current_path)}
          {_nav_link('/blog', 'Blog', current_path)}
          {_nav_link('/coursework', 'Coursework', current_path)}
          <a id=\"theme-toggle\" href=\"/toggle-theme?next={escape(current_path, quote=True)}\" aria-label=\"Toggle theme\">Theme</a>
        </nav>
      </div>
    </header>
    <main id=\"content\" class=\"site-main\">
      {body}
    </main>
    <footer class=\"site-footer\">
      <small>© {datetime.now().year} {brand}</small>
      <a href=\"/feed.xml\">RSS</a>
    </footer>
  </body>
</html>
"""


def _person_same_as(page_meta: dict[str, object], cfg: SiteConfig) -> list[str]:
    same_as: list[str] = []
    links = page_meta.get("links")
    if isinstance(links, list):
        for item in links:
            if isinstance(item, dict):
                url = item.get("url")
                if isinstance(url, str) and url.startswith("http"):
                    same_as.append(url)
    for maybe_url in (cfg.github_url, cfg.linkedin_url, cfg.x_url):
        if maybe_url and maybe_url not in same_as:
            same_as.append(maybe_url)
    return same_as


def _render_tag_spans(tags: list[str]) -> str:
    if not tags:
        return ""
    spans = " ".join(f"<span>#{escape(tag)}</span>" for tag in tags)
    return f'<p class="post-tags">{spans}</p>'


def render_home_page(posts: Iterable[Post], theme: str | None = None, current_path: str = "/") -> str:
    cfg = get_site_config()
    post_items = "\n".join(
        (
            "<li>"
            f"<a href=\"/blog/{escape(p.slug)}\">{escape(p.title)}</a>"
            f"<time datetime=\"{p.date.isoformat()}\">{p.date.date()}</time>"
            "</li>"
        )
        for p in posts
    )
    body = f"""
    <section class=\"home-list reveal\">
      <h1>{escape(cfg.author_name)}</h1>
      <p>Recent writing and research notes.</p>
      <ul>{post_items}</ul>
    </section>
    """
    meta = {
        "title": _meta_title("Home", cfg),
        "description": cfg.site_description,
        "canonical_path": "/",
        "json_ld": {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": cfg.site_title,
            "url": cfg.base_url,
        },
    }
    return _layout(meta=meta, body=body, theme=theme, current_path=current_path)


def render_about_page(theme: str | None = None, current_path: str = "/") -> str:
    page: Page | None = None
    page_meta: dict[str, object]
    try:
        from ..services.content import get_page

        page = get_page("about")
    except Exception:
        page = None

    cfg = get_site_config()
    page_meta = dict(page.meta or {}) if page else {}

    quotes_list: list[str] = []
    if page and page.quotes:
        quotes_list = [str(q) for q in page.quotes]
    if not quotes_list:
        quotes_list = [
            "Build things that are useful before making them impressive.",
            "Keep experiments reproducible and writing clear.",
            "Simple systems leave room for deep ideas.",
        ]

    quote_items = "".join(
        f"<li><blockquote>&ldquo;{escape(str(q))}&rdquo;</blockquote></li>" for q in quotes_list
    )

    featured = None
    if page and page.featured_slug:
        from ..services.content import get_post_by_slug

        featured = get_post_by_slug(page.featured_slug)
    if featured is None:
        featured = next(iter(list_posts(limit=1)), None)

    featured_block = ""
    if featured is not None:
        featured_block = (
            f'<a class="about-card about-featured" href="/blog/{escape(featured.slug)}">'
            "<span class=\"card-eyebrow\">Featured writing</span>"
            f"<span class=\"card-title\">{escape(featured.title)}</span>"
            "<span class=\"card-cta\">Read the post →</span>"
            "</a>"
        )

    links_raw = page_meta.get("links")
    contact_items: list[str] = []
    if isinstance(links_raw, list):
        for item in links_raw:
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
            note_span = f'<span class="about-link-note">{note}</span>' if note else ""
            contact_items.append(f"<li><a href=\"{url}\">{label}</a>{note_span}</li>")

    links_block = ""
    if contact_items:
        links_block = (
            '<div class="about-card about-links">'
            "<h2>Connect</h2>"
            f"<ul>{''.join(contact_items)}</ul>"
            "</div>"
        )

    hero_title_raw = page_meta.get("hero_title") or (page.title if page else None) or cfg.author_name
    hero_title = escape(str(hero_title_raw))
    hero_tagline_raw = page_meta.get("hero_tagline") or page_meta.get("tagline") or cfg.author_role
    hero_tagline = escape(str(hero_tagline_raw))
    location = page_meta.get("location")
    location_html = f'<p class="about-location">{escape(str(location))}</p>' if location else ""

    body_md = page.html if page else "<p>About content is being drafted.</p>"

    body = f"""
    <section class=\"about-layout reveal\">
      <aside class=\"about-sidebar\">
        <figure class=\"about-photo\">
          <img src=\"{static_url('about-portrait.png')}\" alt=\"Portrait of Gunay Soni\" width=\"864\" height=\"1098\" loading=\"lazy\" />
        </figure>
        {location_html}
        {featured_block}
        {links_block}
        <div class=\"about-card about-quotes\">
          <h2>Working principles</h2>
          <ul class=\"quote-list\">{quote_items}</ul>
        </div>
      </aside>
      <article class=\"about-content\">
        <header class=\"about-header\">
          <p class=\"about-eyebrow\">About</p>
          <h1>{hero_title}</h1>
          <p class=\"about-tagline\">{hero_tagline}</p>
        </header>
        <div class=\"about-body\">{body_md}</div>
      </article>
    </section>
    """

    description = (
        page.seo_description
        if page and page.seo_description
        else "Gunay Soni writes about machine learning, uncertainty, and engineering systems."
    )
    same_as = _person_same_as(page_meta, cfg)
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": cfg.author_name,
        "jobTitle": cfg.author_role,
        "description": description,
        "url": cfg.canonical_url("/"),
        "sameAs": same_as,
    }
    meta = {
        "title": _meta_title(page.seo_title if page and page.seo_title else cfg.author_name, cfg),
        "description": description,
        "canonical_path": page.canonical_path if page and page.canonical_path else "/",
        "og_image": page.og_image if page and page.og_image else cfg.default_og_image,
        "json_ld": json_ld,
    }
    return _layout(
        meta=meta,
        body=body,
        theme=theme,
        current_path=current_path,
        body_class="wide about-page",
    )


def render_blog_index_page(posts: Iterable[Post], theme: str | None = None, current_path: str = "/") -> str:
    cfg = get_site_config()
    groups: dict[int, list[Post]] = {}
    for post in posts:
        groups.setdefault(post.date.year, []).append(post)

    year_sections: list[str] = []
    for year in sorted(groups.keys(), reverse=True):
        cards = "".join(
            (
                '<article class="post-card">'
                + f"<h3><a href=\"/blog/{escape(p.slug)}\">{escape(p.title)}</a></h3>"
                + f"<p>{escape(p.summary or 'Read the article')}</p>"
                + f"<time datetime=\"{p.date.isoformat()}\">{p.date.date()}</time>"
                + _render_tag_spans(p.tags)
                + "</article>"
            )
            for p in groups[year]
        )
        year_sections.append(f'<section class="blog-year"><h2>{year}</h2><div class="post-grid">{cards}</div></section>')

    body = f"""
    <section class=\"blog-shell reveal\">
      <header class=\"blog-header\">
        <p class=\"about-eyebrow\">Writing</p>
        <h1>Blog</h1>
        <p>Research logs, engineering notes, and experiments by Gunay Soni.</p>
        <p><a class=\"blog-rss\" href=\"/feed.xml\">Subscribe via RSS</a></p>
      </header>
      {''.join(year_sections)}
    </section>
    """

    json_ld = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": f"{cfg.author_name} Blog",
        "url": cfg.canonical_url("/blog"),
        "description": "Posts and technical essays by Gunay Soni.",
        "author": {"@type": "Person", "name": cfg.author_name},
    }
    meta = {
        "title": _meta_title("Blog", cfg),
        "description": "Posts on machine learning, uncertainty, and engineering by Gunay Soni.",
        "canonical_path": "/blog",
        "json_ld": json_ld,
    }
    return _layout(meta=meta, body=body, theme=theme, current_path=current_path)


def render_post_page(post: Post, theme: str | None = None, current_path: str = "/") -> str:
    cfg = get_site_config()
    extra_head_parts: list[str] = []
    if post.extra_css:
        extra_head_parts.extend(
            f'<link rel="stylesheet" href="{static_url(css_path)}" />' for css_path in post.extra_css
        )

    body_class = "post-page"
    if post.wide:
        body_class = "wide post-page"

    tags_html = ""
    if post.tags:
        tags_html = f"<p class=\"post-tags\">{' '.join(f'<span>#{escape(tag)}</span>' for tag in post.tags)}</p>"

    body = f"""
    <article class=\"post-article reveal\">
      <header class=\"post-header\">
        <p class=\"about-eyebrow\">Article</p>
        <h1>{escape(post.title)}</h1>
        <time datetime=\"{post.date.isoformat()}\">{post.date.date()}</time>
        {tags_html}
      </header>
      <div class=\"post\">{post.html}</div>
    </article>
    """

    canonical_path = post.canonical_path or f"/blog/{post.slug}"
    description = post.seo_description or post.summary or post.title
    json_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": description,
        "datePublished": post.date.isoformat(),
        "dateModified": (post.updated or post.date).isoformat(),
        "author": {"@type": "Person", "name": cfg.author_name},
        "mainEntityOfPage": cfg.canonical_url(canonical_path),
    }
    meta = {
        "title": _meta_title(post.seo_title or post.title, cfg),
        "description": description,
        "canonical_path": canonical_path,
        "og_type": "article",
        "og_image": post.og_image or post.cover_image or cfg.default_og_image,
        "json_ld": json_ld,
        "noindex": post.draft,
    }
    return _layout(
        meta=meta,
        body=body,
        theme=theme,
        current_path=current_path,
        body_class=body_class,
        extra_head="\n".join(extra_head_parts),
    )


def render_coursework_page(theme: str | None = None, current_path: str = "/") -> str:
    cfg = get_site_config()
    coursework_js = static_url("coursework.js")
    coursework_css = static_url("coursework.css")

    body = f"""
    <section class=\"cw-page reveal\">
      <header class=\"cw-intro\">
        <p class=\"about-eyebrow\">Academic map</p>
        <h1>Coursework</h1>
        <p>An interactive map of modules by subject. Select tiles to inspect semester and details.</p>
      </header>

      <div id=\"cw-viz\" class=\"cw\" aria-label=\"Interactive coursework map\">
        <div class=\"cw-layout\">
          <figure class=\"cw-figure\">
            <figcaption class=\"cw-caption\">
              <div class=\"cw-caption-text\">
                <h2>Coursework map</h2>
                <p>Subjects are color-coded. Smaller tiles stay selectable even without labels.</p>
              </div>
              <div class=\"cw-legend\" data-cw-legend aria-label=\"Subject legend\"></div>
            </figcaption>
            <div class=\"cw-toolbar\" aria-label=\"Coursework filters and summary\">
              <label class=\"cw-search\" for=\"cw-search-input\">
                <span>Find a module</span>
                <input id=\"cw-search-input\" type=\"search\" data-cw-search placeholder=\"Search by code, title, or topic\" autocomplete=\"off\" spellcheck=\"false\" />
              </label>
              <div class=\"cw-year-chips\" data-cw-years aria-label=\"Filter by semester\"></div>
              <p class=\"cw-stats\" data-cw-stats>Loading course index…</p>
            </div>
            <div class=\"viz-canvas\" data-viz=\"treemap\" aria-label=\"Coursework treemap\"></div>
          </figure>

          <aside class=\"cw-details\" aria-label=\"Course details\">
            <div class=\"cw-details-card\">
              <div class=\"cw-details-header\">
                <h2>Details</h2>
                <button type=\"button\" class=\"cw-details-clear\" data-cw-clear hidden>Clear</button>
              </div>
              <div class=\"cw-details-body\" data-cw-details>
                <p class=\"cw-details-empty\">Select a course tile to see semester and description.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <noscript>
        <p><strong>Note:</strong> This visualization requires JavaScript. A plain list fallback appears below.</p>
        <div id=\"cw-fallback\"></div>
      </noscript>
    </section>

    <script src=\"https://cdn.jsdelivr.net/npm/d3@7\"></script>
    <script src=\"{coursework_js}\"></script>
    """

    json_ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Coursework",
        "description": "Interactive coursework map for Gunay Soni.",
        "url": cfg.canonical_url("/coursework"),
    }
    meta = {
        "title": _meta_title("Coursework", cfg),
        "description": "Interactive coursework treemap for Gunay Soni.",
        "canonical_path": "/coursework",
        "json_ld": json_ld,
    }
    return _layout(
        meta=meta,
        body=body,
        theme=theme,
        current_path=current_path,
        body_class="wide coursework-page",
        extra_head=f'<link rel="stylesheet" href="{coursework_css}" />',
    )
