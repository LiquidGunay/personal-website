from __future__ import annotations

import os
import re
from html import escape as html_escape
from collections.abc import Iterable
import httpx
from fastapi import Request, WebSocket
from fastapi.responses import HTMLResponse, Response

try:
    from websockets.typing import Subprotocol
except Exception:  # pragma: no cover
    Subprotocol = str  # type: ignore[assignment,misc]

MARIMO_SEMANTIC_ENTROPY_MOUNT = "/marimo/semantic-entropy-probe-comparison"
MARIMO_SEMANTIC_ENTROPY_BASE_URL_ENV = "MARIMO_SEMANTIC_ENTROPY_BASE_URL"
_DEFAULT_BASE_URL = "http://semantic-entropy-probe-comparison.railway.internal"


_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}

_DROP_RESPONSE_HEADERS = {
    *_HOP_BY_HOP_HEADERS,
    "content-length",
    "content-encoding",
    "x-frame-options",
    "content-security-policy",
}

_REWRITE_ATTR_RE = re.compile(r'(?P<attr>\b(?:href|src|action)=["\'])/(?!/)(?P<rest>[^"\']*)')
_HEAD_TAG_RE = re.compile(r"(?i)<head(\s[^>]*)?>")


def _marimo_base_url() -> str:
    return os.getenv(MARIMO_SEMANTIC_ENTROPY_BASE_URL_ENV, _DEFAULT_BASE_URL).strip()


def _join_url(base: str, path: str, query: str) -> str:
    base_norm = base.rstrip("/") + "/"
    path_norm = path.lstrip("/")
    url = base_norm + path_norm
    if query:
        url += "?" + query
    return url


def _rewrite_location(location: str, mount: str) -> str:
    if not location.startswith("/"):
        return location
    if location.startswith(mount):
        return location
    return mount + location


def _rewrite_html(html_bytes: bytes, mount: str) -> bytes:
    try:
        html = html_bytes.decode("utf-8")
    except Exception:
        html = html_bytes.decode("utf-8", errors="replace")

    base_href = mount.rstrip("/") + "/"
    mount_prefix = mount.lstrip("/")

    # Ensure relative URLs resolve under the proxy mount.
    if "<base" not in html.lower():
        m = _HEAD_TAG_RE.search(html)
        if m:
            insert_at = m.end()
            html = html[:insert_at] + f'\n<base href="{base_href}" />' + html[insert_at:]

    # Rewrite root-relative asset paths (e.g. src="/static/app.js") to stay under the mount.
    def _rewrite_attr(match: re.Match[str]) -> str:
        rest = match.group("rest")
        if rest == mount_prefix or rest.startswith(mount_prefix + "/"):
            return match.group(0)
        return f'{match.group("attr")}{base_href}{rest}'

    html = _REWRITE_ATTR_RE.sub(_rewrite_attr, html)
    return html.encode("utf-8")


def _forward_request_headers(headers: Iterable[tuple[str, str]]) -> dict[str, str]:
    forwarded: dict[str, str] = {}
    for key, value in headers:
        key_lower = key.lower()
        if key_lower in _HOP_BY_HOP_HEADERS:
            continue
        if key_lower in {"host", "content-length"}:
            continue
        forwarded[key] = value
    return forwarded


def _filter_response_headers(headers: Iterable[tuple[str, str]]) -> dict[str, str]:
    filtered: dict[str, str] = {}
    for key, value in headers:
        if key.lower() in _DROP_RESPONSE_HEADERS:
            continue
        filtered[key] = value
    filtered.setdefault("X-Robots-Tag", "noindex")
    return filtered


async def proxy_marimo_http(request: Request, *, mount: str, path: str) -> Response:
    upstream_url = _join_url(_marimo_base_url(), path=path, query=str(request.url.query))

    try:
        body = await request.body()
        async with httpx.AsyncClient(follow_redirects=False, timeout=30.0) as client:
            upstream = await client.request(
                request.method,
                upstream_url,
                headers=_forward_request_headers(request.headers.items()),
                content=body,
            )
    except httpx.RequestError as exc:
        msg = (
            "<!doctype html><html><head><meta charset=\"utf-8\" />"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />"
            "<title>Embed unavailable</title></head><body>"
            "<h1>Embed unavailable</h1>"
            "<p>The Marimo service could not be reached from this server.</p>"
            f"<p><code>{html_escape(_marimo_base_url())}</code></p>"
            "<p>For local dev, set "
            f"<code>{html_escape(MARIMO_SEMANTIC_ENTROPY_BASE_URL_ENV)}</code> "
            "to a reachable URL.</p>"
            f"<pre>{html_escape(str(exc))}</pre>"
            "</body></html>"
        )
        return HTMLResponse(content=msg, status_code=502)

    headers = _filter_response_headers(upstream.headers.items())

    location = upstream.headers.get("location")
    if location:
        headers["location"] = _rewrite_location(location, mount=mount)

    content = upstream.content
    content_type = upstream.headers.get("content-type", "")
    if "text/html" in content_type:
        content = _rewrite_html(content, mount=mount)
        headers.pop("content-length", None)

    return Response(content=content, status_code=upstream.status_code, headers=headers)


async def proxy_marimo_websocket(websocket: WebSocket, *, mount: str, path: str) -> None:
    try:
        import anyio
        import websockets
    except Exception:
        await websocket.close(code=1011)
        return

    base = _marimo_base_url()
    if base.startswith("https://"):
        ws_base = "wss://" + base.removeprefix("https://").lstrip("/")
    elif base.startswith("http://"):
        ws_base = "ws://" + base.removeprefix("http://").lstrip("/")
    else:
        ws_base = base

    upstream_url = _join_url(ws_base, path=path, query=str(websocket.url.query))

    subprotocols: list[Subprotocol] = []
    raw_protocol = websocket.headers.get("sec-websocket-protocol")
    if raw_protocol:
        subprotocols = [Subprotocol(p.strip()) for p in raw_protocol.split(",") if p.strip()]

    upstream_headers: list[tuple[str, str]] = []
    for header in ("cookie", "authorization"):
        value = websocket.headers.get(header)
        if value:
            upstream_headers.append((header, value))

    await websocket.accept()

    async with websockets.connect(
        upstream_url,
        extra_headers=upstream_headers,
        subprotocols=subprotocols or None,
        max_size=None,
    ) as upstream:

        async def _client_to_upstream() -> None:
            while True:
                message = await websocket.receive()
                msg_type = message.get("type")
                if msg_type == "websocket.disconnect":
                    await upstream.close()
                    return
                if msg_type != "websocket.receive":
                    continue
                if message.get("text") is not None:
                    await upstream.send(message["text"])
                elif message.get("bytes") is not None:
                    await upstream.send(message["bytes"])

        async def _upstream_to_client() -> None:
            async for message in upstream:
                if isinstance(message, str):
                    await websocket.send_text(message)
                else:
                    await websocket.send_bytes(message)

        async with anyio.create_task_group() as tg:
            tg.start_soon(_client_to_upstream)
            tg.start_soon(_upstream_to_client)
