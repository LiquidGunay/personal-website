from app.services.content import list_posts
from app.services.seo import render_llms_txt, render_robots_txt, render_sitemap_xml
from app.services.site_config import get_site_config


def test_site_config_canonical_url():
    cfg = get_site_config()
    assert cfg.canonical_url("/blog") == "https://gunayintheory.com/blog"


def test_render_robots_has_sitemap_and_ai_bots():
    robots = render_robots_txt()
    assert "Sitemap: https://gunayintheory.com/sitemap.xml" in robots
    assert "User-agent: GPTBot" in robots
    assert "User-agent: PerplexityBot" in robots


def test_render_sitemap_has_core_urls():
    xml = render_sitemap_xml(list_posts())
    assert "https://gunayintheory.com/" in xml
    assert "https://gunayintheory.com/coursework" in xml
    assert "https://gunayintheory.com/blog/hello-world" not in xml
    assert "<urlset" in xml


def test_render_llms_txt_mentions_core_pages():
    text = render_llms_txt()
    assert "https://gunayintheory.com/coursework" in text
    assert "https://gunayintheory.com/blog" not in text
