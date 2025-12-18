from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import frontmatter  # type: ignore[import-untyped]
from markdown_it import MarkdownIt
from mdit_py_plugins.footnote import footnote_plugin
from mdit_py_plugins.tasklists import tasklists_plugin
from pygments.formatters import HtmlFormatter  # type: ignore[import-untyped]


CONTENT_DIR = Path("content/posts")
PAGES_DIR = Path("content/pages")


md = MarkdownIt("commonmark").use(footnote_plugin).use(tasklists_plugin)
md = md.enable("html_block").enable("html_inline")


@dataclass
class Post:
    title: str
    slug: str
    date: datetime
    summary: str | None
    tags: list[str]
    draft: bool
    updated: datetime | None
    cover_image: str | None
    html: str
    wide: bool = False
    extra_css: list[str] = field(default_factory=list)


@dataclass
class Page:
    title: str
    html: str
    featured_slug: str | None = None
    quotes: list[str] | None = None
    meta: dict[str, object] | None = None


def _parse_date(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def _load_post(path: Path) -> Post | None:
    fm = frontmatter.load(path)
    slug = fm.get("slug") or path.parent.name
    title = fm.get("title") or slug
    date = _parse_date(fm.get("date")) or datetime.fromtimestamp(path.stat().st_mtime)
    summary = fm.get("summary")
    tags = fm.get("tags") or []
    draft = bool(fm.get("draft", False))
    updated = _parse_date(fm.get("updated"))
    cover_image = fm.get("cover_image")
    wide = bool(fm.get("wide", False))
    extra_css_raw = fm.get("extra_css") or []
    if isinstance(extra_css_raw, str):
        extra_css = [extra_css_raw]
    elif isinstance(extra_css_raw, list | tuple):
        extra_css = [str(item) for item in extra_css_raw if item]
    else:
        extra_css = []
    html = md.render(fm.content)
    return Post(
        title=title,
        slug=slug,
        date=date,
        summary=summary,
        tags=list(tags),
        draft=draft,
        updated=updated,
        cover_image=cover_image,
        html=html,
        wide=wide,
        extra_css=extra_css,
    )


def list_posts(limit: int | None = None, include_drafts: bool = False) -> list[Post]:
    posts: list[Post] = []
    if not CONTENT_DIR.exists():
        return posts
    for post_dir in sorted(CONTENT_DIR.iterdir(), reverse=True):
        index_md = post_dir / "index.md"
        if not index_md.exists():
            continue
        post = _load_post(index_md)
        if post is None:
            continue
        if (not include_drafts) and post.draft:
            continue
        posts.append(post)
        if limit and len(posts) >= limit:
            break
    posts.sort(key=lambda p: p.date, reverse=True)
    return posts


def get_post_by_slug(slug: str) -> Post | None:
    path = CONTENT_DIR / slug / "index.md"
    if not path.exists():
        return None
    return _load_post(path)


def syntax_highlight_css() -> str:
    css: str = HtmlFormatter(style="github-dark").get_style_defs(".codehilite")
    return css


def get_page(slug: str) -> Page | None:
    """Load a simple Markdown page from content/pages/<slug>.md with optional frontmatter title."""
    path = PAGES_DIR / f"{slug}.md"
    if not path.exists():
        return None
    fm = frontmatter.load(path)
    title = fm.get("title") or slug.capitalize()
    html = md.render(fm.content)
    featured_slug = fm.get("featured_slug")
    quotes_list = fm.get("quotes") or []
    quotes = list(quotes_list) if isinstance(quotes_list, list | tuple) else []
    metadata = dict(fm.metadata)
    return Page(
        title=title,
        html=html,
        featured_slug=featured_slug,
        quotes=quotes,
        meta=metadata,
    )
