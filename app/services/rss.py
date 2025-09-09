from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import List

from .content import Post, list_posts


SITE_TITLE = "Personal Blog"
SITE_URL = "https://example.com"  # TODO: replace when domain is set
SITE_DESCRIPTION = "Technical blog and projects"


def _rss_item_xml(post: Post) -> str:
    pub_date = post.date.astimezone(UTC).strftime("%a, %d %b %Y %H:%M:%S %z")
    link = f"{SITE_URL}/blog/{escape(post.slug)}"
    title = escape(post.title)
    description = escape(post.summary or post.title)
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
    posts: List[Post] = list_posts(limit=20)
    items = "".join(_rss_item_xml(p) for p in posts)
    last_build_date = datetime.now(tz=UTC).strftime("%a, %d %b %Y %H:%M:%S %z")
    xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<rss version=\"2.0\">"
        "<channel>"
        f"<title>{escape(SITE_TITLE)}</title>"
        f"<link>{SITE_URL}</link>"
        f"<description>{escape(SITE_DESCRIPTION)}</description>"
        f"<lastBuildDate>{last_build_date}</lastBuildDate>"
        f"{items}"
        "</channel>"
        "</rss>"
    )
    return xml


