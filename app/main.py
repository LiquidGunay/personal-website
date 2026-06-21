from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, RedirectResponse, Response

from .services.content import Page, Post, get_page, get_post_by_slug, list_posts
from .services.rss import render_rss
from .services.seo import render_llms_txt, render_robots_txt, render_sitemap_xml

app = FastAPI()

REPO_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = REPO_ROOT / "app" / "static"
FRONTEND_DIST_DIR = REPO_ROOT / "frontend" / "out"
COURSEWORK_PATH = STATIC_DIR / "courses.json"


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


def _serialize_post_list_item(post: Post) -> dict[str, Any]:
    return {
        "slug": post.slug,
        "title": post.title,
        "date": post.date.isoformat(),
        "updated": post.updated.isoformat() if post.updated else None,
        "summary": post.summary,
        "tags": post.tags,
        "status": post.status,
        "hero": post.hero,
        "series": post.series,
        "canonicalPath": post.canonical_path,
    }


def _serialize_post(post: Post) -> dict[str, Any]:
    payload = _serialize_post_list_item(post)
    payload.update({"content": post.content})
    return payload


def _serialize_page(page: Page) -> dict[str, Any]:
    return {
        "slug": page.slug,
        "title": page.title,
        "meta": page.meta,
        "content": page.content,
    }


def _read_frontend_asset(request_path: str) -> Path | None:
    rel = request_path.strip("/")
    if not rel:
        index = FRONTEND_DIST_DIR / "index.html"
        return index if index.exists() else None

    candidate = FRONTEND_DIST_DIR / rel
    if candidate.is_file():
        return candidate
    if candidate.is_dir():
        index_path = candidate / "index.html"
        if index_path.is_file():
            return index_path
    return None


def _serve_frontend(path: str) -> Response:
    if not FRONTEND_DIST_DIR.exists():
        return PlainTextResponse(
            "Frontend not built. Run `npm --prefix frontend install && npm --prefix frontend run build`.",
            status_code=503,
        )

    candidate = _read_frontend_asset(path)
    if candidate is not None:
        return FileResponse(candidate)

    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    raise HTTPException(status_code=404, detail="Not found")


@app.get("/api/posts")
def api_list_posts() -> list[dict[str, Any]]:
    return [_serialize_post_list_item(post) for post in list_posts()]


@app.get("/api/posts/{slug}")
def api_post_by_slug(slug: str) -> dict[str, Any]:
    post = get_post_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return _serialize_post(post)


@app.get("/api/page/{slug}")
def api_page(slug: str) -> dict[str, Any]:
    page = get_page(slug)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return _serialize_page(page)


@app.get("/api/coursework")
def api_coursework() -> dict[str, Any]:
    if not COURSEWORK_PATH.exists():
        raise HTTPException(status_code=404, detail="Coursework data not found")
    try:
        raw = json.loads(COURSEWORK_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Coursework parse failed: {exc}") from exc
    return raw


@app.get("/feed.xml")
def feed() -> Response:
    xml = render_rss()
    return Response(content=xml, media_type="application/rss+xml")


@app.get("/robots.txt")
def robots() -> Response:
    return Response(content=render_robots_txt(), media_type="text/plain")


@app.get("/sitemap.xml")
def sitemap() -> Response:
    xml = render_sitemap_xml(list_posts())
    return Response(content=xml, media_type="application/xml")


@app.get("/llms.txt")
def llms_txt() -> Response:
    return Response(content=render_llms_txt(), media_type="text/plain")


@app.get("/about", include_in_schema=False)
@app.get("/about/", include_in_schema=False)
def about() -> Response:
    return RedirectResponse(url="/", status_code=308)


@app.get("/blog", include_in_schema=False)
def blog() -> Response:
    return _serve_frontend("blog")


@app.get("/coursework", include_in_schema=False)
def coursework() -> Response:
    return _serve_frontend("coursework")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def home() -> Response:
    return _serve_frontend("")


@app.get("/{path:path}", include_in_schema=False)
def spa_fallback(path: str) -> Response:
    return _serve_frontend(path)
