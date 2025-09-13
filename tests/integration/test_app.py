from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_home_about_page():
    r = client.get("/")
    assert r.status_code == 200
    assert "About" in r.text


def test_blog_index():
    r = client.get("/blog")
    assert r.status_code == 200
    assert "Blog" in r.text


def test_blog_post():
    r = client.get("/blog/hello-world")
    assert r.status_code == 200
    assert "Hello, World" in r.text


def test_rss_feed():
    r = client.get("/feed.xml")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/rss+xml")


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_coursework_page():
    r = client.get("/coursework")
    assert r.status_code == 200
    assert "Coursework" in r.text

