from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import List

from .content import Post, list_posts
from .site_config import get_site_config


def _rss_item_xml(post: Post) -> str:
    cfg = get_site_config()
    pub_date = post.date.astimezone(UTC).strftime("%a, %d %b %Y %H:%M:%S %z")
    canonical_path = post.canonical_path or f"/blog/{post.slug}"
    link = cfg.canonical_url(canonical_path)
    title = escape(post.title)
    description = escape(post.seo_description or post.summary or post.title)
    return (
        f"<item>"
        f"<title>{title}</title>"
        f"<link>{link}</link>"
        f"<guid>{link}</guid>"
        f"<pubDate>{pub_date}</pubDate>"
        f"<description>{description}</description>"
        f"</item>"
    )


def render_rss() -> str:
    cfg = get_site_config()
    posts: List[Post] = list_posts(limit=20)
    items = "".join(_rss_item_xml(p) for p in posts)
    last_build_date = datetime.now(tz=UTC).strftime("%a, %d %b %Y %H:%M:%S %z")
    xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<rss version=\"2.0\">"
        "<channel>"
        f"<title>{escape(cfg.site_title)}</title>"
        f"<link>{cfg.base_url}</link>"
        f"<description>{escape(cfg.site_description)}</description>"
        f"<lastBuildDate>{last_build_date}</lastBuildDate>"
        f"{items}"
        "</channel>"
        "</rss>"
    )
    return xml

