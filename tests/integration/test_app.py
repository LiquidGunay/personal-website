from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_posts_api():
    r = client.get("/api/posts")
    assert r.status_code == 200
    payload = r.json()
    assert isinstance(payload, list)
    assert any(item.get("slug") == "hello-world" for item in payload)


def test_get_post_api():
    r = client.get("/api/posts/hello-world")
    assert r.status_code == 200
    assert r.json()["slug"] == "hello-world"
    assert "Hello, World" in r.json()["content"]


def test_get_post_api_404():
    r = client.get("/api/posts/nope")
    assert r.status_code == 404


def test_get_about_page_content_api():
    r = client.get("/api/page/about")
    assert r.status_code == 200
    body = r.json()
    assert body["slug"] == "about"
    assert body["title"] == "Gunay Soni"


def test_coursework_api():
    r = client.get("/api/coursework")
    assert r.status_code == 200
    payload = r.json()
    assert isinstance(payload, dict)
    assert "hierarchy" in payload


def test_rss_feed():
    r = client.get("/feed.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/rss+xml")
    assert "https://gunayintheory.com/blog/hello-world" in r.text


def test_sitemap_xml():
    r = client.get("/sitemap.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/xml")
    assert "https://gunayintheory.com/" in r.text


def test_robots_txt():
    r = client.get("/robots.txt")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert "Sitemap: https://gunayintheory.com/sitemap.xml" in r.text


def test_llms_txt():
    r = client.get("/llms.txt")
    assert r.status_code == 200
    assert "https://gunayintheory.com/coursework" in r.text
    assert "https://gunayintheory.com/blog" not in r.text
