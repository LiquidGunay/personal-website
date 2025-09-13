from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from starlette.staticfiles import StaticFiles

from .services.content import get_post_by_slug, list_posts
from .services.rss import render_rss
from .views.pages import (
    render_about_page,
    render_blog_index_page,
    render_coursework_page,
    render_home_page,
    render_post_page,
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
def home() -> HTMLResponse:
    return HTMLResponse(render_about_page())


@app.get("/blog", response_class=HTMLResponse)
def blog_index() -> HTMLResponse:
    posts = list_posts()
    return HTMLResponse(render_blog_index_page(posts))


@app.get("/blog/{slug}", response_class=HTMLResponse)
def blog_post(slug: str) -> HTMLResponse:
    post = get_post_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return HTMLResponse(render_post_page(post))


@app.get("/coursework", response_class=HTMLResponse)
def coursework() -> HTMLResponse:
    return HTMLResponse(render_coursework_page())


@app.get("/feed.xml")
def feed() -> Response:
    xml = render_rss()
    return Response(content=xml, media_type="application/rss+xml")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


