from app.services.content import get_post_by_slug, list_posts


def test_list_posts_returns_items():
    posts = list_posts()
    assert isinstance(posts, list)
    assert any(p.slug == "hello-world" for p in posts)


def test_get_post_by_slug():
    post = get_post_by_slug("hello-world")
    assert post is not None
    assert "Hello" in post.title
    assert "Hello" in post.html


