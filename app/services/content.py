from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

import frontmatter  # type: ignore[import-untyped]


try:
    from markdown_it import MarkdownIt
except Exception:  # pragma: no cover
    MarkdownIt = None  # type: ignore[assignment]


CONTENT_DIR = Path("content/posts")
PAGES_DIR = Path("content/pages")


@dataclass
class Post:
    title: str
    slug: str
    date: datetime
    summary: str | None
    tags: list[str]
    status: str
    updated: datetime | None
    hero: str | None
    series: str | None
    canonical_path: str | None
    content: str
    seo_title: str | None = field(default=None, init=False)
    seo_description: str | None = field(default=None, init=False)

    @property
    def draft(self) -> bool:
        return self.status.lower() == "draft"

    @property
    def wide(self) -> bool:
        return False

    @property
    def extra_css(self) -> list[str]:
        return []

    @property
    def cover_image(self) -> str | None:
        return self.hero

    @property
    def html(self) -> str:
        return _render_markdown(self.content)

    @property
    def canonical_path_or_default(self) -> str:
        return self.canonical_path or f"/blog/{self.slug}"


@dataclass
class Page:
    title: str
    slug: str
    meta: dict[str, object]
    content: str

    @property
    def html(self) -> str:
        return _render_markdown(self.content)

    @property
    def quotes(self) -> list[str]:
        raw = self.meta.get("quotes")
        if isinstance(raw, list):
            return [str(item).strip() for item in raw if str(item).strip()]
        return []

    @property
    def featured_slug(self) -> str | None:
        slug = self.meta.get("featured_slug")
        if isinstance(slug, str):
            return slug.strip() or None
        return None

    @property
    def seo_title(self) -> str | None:
        title = self.meta.get("seo_title")
        return title if isinstance(title, str) and title.strip() else None

    @property
    def seo_description(self) -> str | None:
        value = self.meta.get("seo_description")
        return value if isinstance(value, str) and value.strip() else None

    @property
    def og_image(self) -> str | None:
        image = self.meta.get("og_image")
        return image if isinstance(image, str) and image.strip() else None


@dataclass
class _RenderCache:
    markdown: Any | None = None


_render_cache = _RenderCache()


def _md_renderer() -> Any | None:
    if _render_cache.markdown is not None:
        return _render_cache.markdown
    if MarkdownIt is None:
        return None
    try:
        _render_cache.markdown = MarkdownIt("commonmark")
        return _render_cache.markdown
    except Exception:
        return None


def _render_markdown(value: str) -> str:
    renderer = _md_renderer()
    if renderer is None:
        return value
    try:
        return renderer.render(value)
    except Exception:
        return value


def syntax_highlight_css() -> str:
    try:
        from pygments.formatters import HtmlFormatter

        return HtmlFormatter().get_style_defs(".highlight")
    except Exception:
        return ""


def _parse_date(value: object) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None


def _slugify(value: object, default: str) -> str:
    raw = str(value).strip() if value is not None else ""
    return raw or default


def _string_list(raw: object) -> list[str]:
    if isinstance(raw, (list, tuple)):
        return [str(item).strip() for item in raw if str(item).strip()]
    if isinstance(raw, str):
        value = raw.strip()
        return [tag for tag in (item.strip() for item in value.split(",")) if tag]
    return []


def _normalize_status(raw: object, *, draft: object | None) -> str:
    if raw is not None:
        value = str(raw).strip().lower()
        if value:
            return value
    if bool(draft):
        return "draft"
    return "published"


def _load_post(path: Path) -> Post | None:
    if not path.exists():
        return None

    parsed = frontmatter.load(path)
    slug = _slugify(parsed.metadata.get("slug"), path.parent.name)
    title = _slugify(parsed.metadata.get("title"), slug)
    date = _parse_date(parsed.metadata.get("date")) or datetime.fromtimestamp(path.stat().st_mtime)
    summary = parsed.metadata.get("summary")
    summary_text = str(summary) if summary is not None else None
    tags = _string_list(parsed.metadata.get("tags"))
    status = _normalize_status(parsed.metadata.get("status"), draft=parsed.metadata.get("draft"))
    updated = _parse_date(parsed.metadata.get("updated"))
    hero = parsed.metadata.get("hero")
    hero_text = str(hero) if hero is not None else None
    series = parsed.metadata.get("series")
    series_text = str(series) if series is not None else None
    canonical = parsed.metadata.get("canonical_path")
    canonical_path = str(canonical) if isinstance(canonical, str) else None

    return Post(
        title=title,
        slug=slug,
        date=date,
        summary=summary_text,
        tags=tags,
        status=status,
        updated=updated,
        hero=hero_text,
        series=series_text,
        canonical_path=canonical_path,
        content=parsed.content.strip("\n") + "\n",
    )


def list_posts(limit: int | None = None, include_drafts: bool = False) -> list[Post]:
    posts: list[Post] = []
    if not CONTENT_DIR.exists():
        return posts

    post_dirs = sorted([p for p in CONTENT_DIR.iterdir() if p.is_dir() and (p / "index.md").exists()], key=lambda item: item.name)
    for item in post_dirs:
        post = _load_post(item / "index.md")
        if post is None:
            continue
        if not include_drafts and post.status == "draft":
            continue
        posts.append(post)

    posts.sort(key=lambda post: post.date, reverse=True)

    if limit is not None and limit > 0:
        return posts[:limit]
    return posts


def get_post_by_slug(slug: str) -> Post | None:
    path = CONTENT_DIR / slug / "index.md"
    post = _load_post(path)
    if post is None:
        return None
    if post.status == "draft":
        return None
    return post


def get_post_by_slug_including_drafts(slug: str) -> Post | None:
    path = CONTENT_DIR / slug / "index.md"
    return _load_post(path)


def get_page(slug: str) -> Page | None:
    path = PAGES_DIR / f"{slug}.md"
    if not path.exists():
        return None

    parsed = frontmatter.load(path)
    title = _slugify(parsed.metadata.get("title"), slug)
    return Page(
        title=title,
        slug=slug,
        meta=dict(parsed.metadata),
        content=parsed.content.strip("\n") + "\n",
    )
