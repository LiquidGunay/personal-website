from app.services.content import get_post_by_slug, list_posts


def test_list_posts_returns_items():
    posts = list_posts()
    assert isinstance(posts, list)
    assert any(p.slug == "hello-world" for p in posts)
    for post in posts:
        assert post.status in {"published", "draft"}


def test_get_post_by_slug():
    post = get_post_by_slug("hello-world")
    assert post is not None
    assert "Hello World" in post.title
    assert "Hello, World" in post.content
    assert post.canonical_path == "/blog/hello-world"
    assert post.status == "published"
