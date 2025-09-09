from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from ..services.content import Post


def _layout(title: str, body: str) -> str:
    return f"""
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title}</title>
    <link rel=\"stylesheet\" href=\"/static/base.css\" />
  </head>
  <body>
    <header>
      <nav>
        <a href=\"/\">Home</a>
        <a href=\"/blog\">Blog</a>
      </nav>
    </header>
    <main>
      {body}
    </main>
    <footer>
      <small>© {datetime.now().year}</small>
    </footer>
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


def render_blog_index_page(posts: Iterable[Post]) -> str:
    items = "\n".join(
        (
            f"<li><a href=\"/blog/{p.slug}\">{p.title}</a> — "
            f"<time datetime=\"{p.date.isoformat()}\">{p.date.date()}</time></li>"
        )
        for p in posts
    )
    body = f"""
    <section>
      <h1>Blog</h1>
      <ul>{items}</ul>
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


