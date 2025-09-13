from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from ..services.content import Page, Post, list_posts, syntax_highlight_css


def _layout(title: str, body: str) -> str:
    return f"""
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <link rel=\"stylesheet\" href=\"/static/base.css\" />
    <style>{syntax_highlight_css()}</style>
  </head>
  <body>
    <a class="skip" href="#content">Skip to content</a>
    <header>
      <nav>
        <a href=\"/\">About</a>
        <a href=\"/blog\">Blog</a>
        <a href=\"/coursework\">Coursework</a>
        <button id=\"theme-toggle\" aria-label=\"Toggle theme\">🌓</button>
      </nav>
    </header>
    <main id=\"content\">
      {body}
    </main>
    <footer>
      <small>© {datetime.now().year}</small>
    </footer>
    <script>
      (function(){{
        var root = document.documentElement;
        var stored = localStorage.getItem('theme');
        if (stored === 'dark') {{ root.dataset.theme = 'dark'; }}
        if (stored === 'light') {{ root.dataset.theme = 'light'; }}
        var btn = document.getElementById('theme-toggle');
        if (btn) {{
          btn.addEventListener('click', function(){{
            var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            localStorage.setItem('theme', next);
          }});
        }}
      }})();
    </script>
  </body>
</html>
"""


def render_home_page(posts: Iterable[Post]) -> str:
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
    return _layout("Home", body)


def render_about_page() -> str:
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
    quotes_parts: list[str] = []
    for idx, q in enumerate(quotes_list):
        style = "" if idx == 0 else ' style="display:none"'
        quotes_parts.append(f"<blockquote{style}>“{q}”</blockquote>")
    quotes_html = "".join(quotes_parts)

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
      <div class=\"quotes\" data-rotate=\"1\">{quotes_html}</div>
      {body_md}
    </section>
    <script>
      (function(){{
        var box = document.querySelector('.quotes');
        if(!box) return;
        var quotes = box.querySelectorAll('blockquote');
        var i = 0;
        setInterval(function(){{
          quotes[i].style.display='none';
          i = (i+1)%quotes.length;
          quotes[i].style.display='block';
        }}, 5000);
      }})();
    </script>
    """
    return _layout("About", body)


def render_blog_index_page(posts: Iterable[Post]) -> str:
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
    return _layout("Blog", body)


def render_post_page(post: Post) -> str:
    body = f"""
    <article>
      <h1>{post.title}</h1>
      <time datetime=\"{post.date.isoformat()}\">{post.date.date()}</time>
      <div class=\"post\">{post.html}</div>
    </article>
    """
    return _layout(post.title, body)


def render_coursework_page() -> str:
    body = """
    <section>
      <h1>Coursework</h1>
      <p>Visualization ideas coming soon. Brainstorm: grouped/stacked bars, timelines, treemap, sunburst, heatmap, beeswarm.</p>
    </section>
    """
    return _layout("Coursework", body)


