from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_home_page():
    r = client.get("/")
    assert r.status_code == 200
    assert "Latest posts" in r.text


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

