from __future__ import annotations

from datetime import UTC, datetime
from html import escape
from typing import Iterable

from .content import Post
from .site_config import get_site_config


def _iso_date(value: datetime) -> str:
    return value.astimezone(UTC).date().isoformat()


def render_robots_txt() -> str:
    cfg = get_site_config()
    today = datetime.now(tz=UTC).date().isoformat()
    ai_agents = [
        "GPTBot",
        "OAI-SearchBot",
        "ChatGPT-User",
        "ClaudeBot",
        "anthropic-ai",
        "PerplexityBot",
        "Perplexity-User",
    ]
    lines = [
        f"# robots.txt for {cfg.base_url}",
        f"# Updated: {today}",
        "# AI crawler policy follows explicit allowlisting for discovery.",
        "",
        "User-agent: *",
        "Allow: /",
        "",
    ]
    for agent in ai_agents:
        lines.extend(
            [
                f"User-agent: {agent}",
                "Allow: /",
                "",
            ]
        )
    lines.append(f"Sitemap: {cfg.canonical_url('/sitemap.xml')}")
    return "\n".join(lines) + "\n"


def render_sitemap_xml(posts: Iterable[Post]) -> str:
    cfg = get_site_config()
    now_date = _iso_date(datetime.now(tz=UTC))

    entries: list[tuple[str, str]] = [
        ("/", now_date),
        ("/coursework", now_date),
    ]

    url_nodes = "".join(
        (
            "<url>"
            f"<loc>{escape(cfg.canonical_url(path))}</loc>"
            f"<lastmod>{lastmod}</lastmod>"
            "</url>"
        )
        for path, lastmod in entries
    )
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
        f"{url_nodes}"
        "</urlset>"
    )


def render_llms_txt() -> str:
    cfg = get_site_config()
    lines = [
        f"# {cfg.site_title}",
        "",
        cfg.site_description,
        "",
        "## Canonical Site",
        f"- {cfg.base_url}",
        "",
        "## Key URLs",
        f"- {cfg.canonical_url('/')} : Home",
        f"- {cfg.canonical_url('/coursework')} : Coursework",
        f"- {cfg.canonical_url('/sitemap.xml')} : XML sitemap",
        "",
        "## Author",
        f"- Name: {cfg.author_name}",
        f"- Role: {cfg.author_role}",
    ]
    if cfg.github_url:
        lines.append(f"- GitHub: {cfg.github_url}")
    if cfg.linkedin_url:
        lines.append(f"- LinkedIn: {cfg.linkedin_url}")
    if cfg.x_url:
        lines.append(f"- X: {cfg.x_url}")
    return "\n".join(lines) + "\n"
