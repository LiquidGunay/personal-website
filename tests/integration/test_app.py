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


def test_theme_toggle_present_on_pages():
    for path in ["/", "/blog", "/blog/hello-world", "/coursework"]:
        r = client.get(path)
        assert r.status_code == 200
        assert 'id="theme-toggle"' in r.text


def test_about_page_layout_markup():
    r = client.get("/")
    assert r.status_code == 200
    assert 'class="about-layout"' in r.text
    assert 'class="about-card about-featured"' in r.text
    assert 'class="about-card about-quotes"' in r.text


def test_theme_cookie_toggle_and_html_attr():
    r1 = client.get("/")
    assert r1.status_code == 200
    # No explicit data-theme attribute when no cookie
    assert 'data-theme="' not in r1.text

    r2 = client.get("/toggle-theme", follow_redirects=False)
    assert r2.status_code in (302, 303)
    assert "set-cookie" in {k.lower(): v for k, v in r2.headers.items()}
    cookie = r2.headers["set-cookie"].split(";")[0]
    # Apply cookie and hit home again
    r3 = client.get("/", headers={"Cookie": cookie})
    assert r3.status_code == 200
    assert 'data-theme="' in r3.text
