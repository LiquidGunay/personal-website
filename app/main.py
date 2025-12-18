from __future__ import annotations

from fastapi import Cookie, FastAPI, HTTPException, Request, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from starlette.staticfiles import StaticFiles

from .services.content import get_post_by_slug, list_posts
from .services.marimo_proxy import (
    MARIMO_SEMANTIC_ENTROPY_MOUNT,
    proxy_marimo_http,
    proxy_marimo_websocket,
)
from .services.rss import render_rss
from .views.pages import (
    render_about_page,
    render_blog_index_page,
    render_coursework_page,
    render_post_page,
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
def home(request: Request, theme: str | None = Cookie(default=None, name="theme")) -> HTMLResponse:
    return HTMLResponse(render_about_page(theme=theme, current_path=str(request.url.path)))


@app.get("/blog", response_class=HTMLResponse)
def blog_index(request: Request, theme: str | None = Cookie(default=None, name="theme")) -> HTMLResponse:
    posts = list_posts()
    return HTMLResponse(render_blog_index_page(posts, theme=theme, current_path=str(request.url.path)))


@app.get("/blog/{slug}", response_class=HTMLResponse)
def blog_post(request: Request, slug: str, theme: str | None = Cookie(default=None, name="theme")) -> HTMLResponse:
    post = get_post_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return HTMLResponse(render_post_page(post, theme=theme, current_path=str(request.url.path)))


@app.get(MARIMO_SEMANTIC_ENTROPY_MOUNT, include_in_schema=False)
def marimo_root_redirect() -> RedirectResponse:
    return RedirectResponse(url=f"{MARIMO_SEMANTIC_ENTROPY_MOUNT}/", status_code=307)


@app.api_route(
    f"{MARIMO_SEMANTIC_ENTROPY_MOUNT}/{{path:path}}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
async def marimo_proxy(request: Request, path: str) -> Response:
    return await proxy_marimo_http(request, mount=MARIMO_SEMANTIC_ENTROPY_MOUNT, path=path)


@app.websocket(f"{MARIMO_SEMANTIC_ENTROPY_MOUNT}/{{path:path}}")
async def marimo_ws_proxy(websocket: WebSocket, path: str) -> None:
    await proxy_marimo_websocket(websocket, mount=MARIMO_SEMANTIC_ENTROPY_MOUNT, path=path)


@app.get("/coursework", response_class=HTMLResponse)
def coursework(request: Request, theme: str | None = Cookie(default=None, name="theme")) -> HTMLResponse:
    return HTMLResponse(render_coursework_page(theme=theme, current_path=str(request.url.path)))


@app.get("/toggle-theme")
def toggle_theme(next: str = "/", theme: str | None = Cookie(default=None, name="theme")) -> RedirectResponse:
    new_theme = "dark" if theme != "dark" else "light"
    resp = RedirectResponse(url=next or "/", status_code=303)
    resp.set_cookie("theme", new_theme, max_age=60*60*24*365, path="/")
    return resp


@app.get("/feed.xml")
def feed() -> Response:
    xml = render_rss()
    return Response(content=xml, media_type="application/rss+xml")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
