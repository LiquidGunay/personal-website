from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_home_about_page():
    r = client.get("/")
    assert r.status_code == 200
    assert "Gunay Soni" in r.text
    assert 'rel="canonical" href="https://gunayintheory.com/"' in r.text
    assert 'application/ld+json' in r.text


def test_blog_index():
    r = client.get("/blog")
    assert r.status_code == 200
    assert "Blog" in r.text
    assert 'rel="canonical" href="https://gunayintheory.com/blog"' in r.text


def test_blog_post():
    r = client.get("/blog/hello-world")
    assert r.status_code == 200
    assert "Hello, World" in r.text
    assert 'property="og:type" content="article"' in r.text


def test_blog_post_marimo_embed_present():
    r = client.get("/blog/semantic-entropy-probe-comparison")
    assert r.status_code == 200
    assert 'class="marimo-embed"' in r.text
    assert 'src="/static/marimo/semantic-entropy-probe-comparison/index.html"' in r.text


def test_rss_feed():
    r = client.get("/feed.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/rss+xml")
    assert "https://gunayintheory.com/blog/hello-world" in r.text


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_coursework_page():
    r = client.get("/coursework")
    assert r.status_code == 200
    assert "Coursework" in r.text


def test_theme_toggle_present_on_pages():
    for path in ["/", "/blog", "/blog/hello-world", "/coursework"]:
        r = client.get(path)
        assert r.status_code == 200
        assert 'id="theme-toggle"' in r.text


def test_theme_cookie_toggle_and_html_attr():
    r1 = client.get("/")
    assert r1.status_code == 200
    assert 'data-theme="' not in r1.text

    r2 = client.get("/toggle-theme", follow_redirects=False)
    assert r2.status_code in (302, 303)
    assert "set-cookie" in {k.lower(): v for k, v in r2.headers.items()}
    cookie = r2.headers["set-cookie"].split(";")[0]
    r3 = client.get("/", headers={"Cookie": cookie})
    assert r3.status_code == 200
    assert 'data-theme="' in r3.text


def test_robots_txt():
    r = client.get("/robots.txt")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert "User-agent: GPTBot" in r.text
    assert "User-agent: OAI-SearchBot" in r.text
    assert "Sitemap: https://gunayintheory.com/sitemap.xml" in r.text


def test_sitemap_xml():
    r = client.get("/sitemap.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert "https://gunayintheory.com/blog/hello-world" in r.text
    assert "https://gunayintheory.com/coursework" in r.text


def test_llms_txt():
    r = client.get("/llms.txt")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert "https://gunayintheory.com/blog" in r.text
    assert "Gunay Soni" in r.text
