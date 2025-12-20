from __future__ import annotations

import logging
import json
import os
import re
from collections.abc import Iterable
from html import escape as html_escape, unescape as html_unescape

import httpx
from fastapi import Request, WebSocket
from fastapi.responses import HTMLResponse, Response

logger = logging.getLogger(__name__)

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
_MARIMO_USER_CONFIG_RE = re.compile(
    r'(?is)(<marimo-user-config[^>]*\bdata-config=")(?P<cfg>[^"]*)(")'
)
_MARIMO_MOUNT_CONFIG_RE = re.compile(
    r"(?is)(window\.__MARIMO_MOUNT_CONFIG__\s*=\s*\{)(?P<body>.*?)(\}\s*;)"
)


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


def _rewrite_html(html_bytes: bytes, mount: str, *, theme: str | None = None) -> bytes:
    try:
        html = html_bytes.decode("utf-8")
    except Exception:
        html = html_bytes.decode("utf-8", errors="replace")

    base_href = mount.rstrip("/") + "/"
    mount_prefix = mount.lstrip("/")

    if theme in {"dark", "light"}:
        html = _rewrite_marimo_theme(html, theme=theme)

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


def _rewrite_marimo_theme(html: str, *, theme: str) -> str:
    html = _rewrite_marimo_mount_config_theme(html, theme=theme)
    html = _rewrite_marimo_user_config_theme(html, theme=theme)
    return html


def _rewrite_marimo_mount_config_theme(html: str, *, theme: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        segment = match.group(0)
        return re.sub(r'("theme"\s*:\s*")[^"]+(")', rf"\1{theme}\2", segment, count=1)

    return _MARIMO_MOUNT_CONFIG_RE.sub(_replace, html, count=1)


def _rewrite_marimo_user_config_theme(html: str, *, theme: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        raw_cfg = match.group("cfg")
        try:
            cfg_json = html_unescape(raw_cfg)
            cfg = json.loads(cfg_json)
            display = cfg.get("display")
            if not isinstance(display, dict):
                display = {}
                cfg["display"] = display
            display["theme"] = theme
            new_cfg_json = json.dumps(cfg, ensure_ascii=False, separators=(",", ":"))
            escaped_cfg = html_escape(new_cfg_json, quote=True)
            return match.group(1) + escaped_cfg + match.group(3)
        except Exception:
            return match.group(0)

    return _MARIMO_USER_CONFIG_RE.sub(_replace, html, count=1)


def _append_vary(headers: dict[str, str], value: str) -> None:
    existing_key: str | None = None
    existing_value: str | None = None
    for key, header_value in headers.items():
        if key.lower() == "vary":
            existing_key = key
            existing_value = header_value
            break

    if existing_key is None or existing_value is None:
        headers["Vary"] = value
        return

    parts = [part.strip() for part in existing_value.split(",") if part.strip()]
    lower_parts = {part.lower() for part in parts}
    if value.lower() in lower_parts:
        return
    headers[existing_key] = existing_value + f", {value}"


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
        theme_cookie = request.cookies.get("theme")
        theme = theme_cookie if theme_cookie in {"dark", "light"} else None
        content = _rewrite_html(content, mount=mount, theme=theme)
        headers.pop("content-length", None)
        if theme is not None:
            _append_vary(headers, "Cookie")

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

    try:
        upstream = await websockets.connect(
            upstream_url,
            additional_headers=upstream_headers,
            subprotocols=subprotocols or None,
            max_size=None,
        )
    except Exception:
        logger.exception("Marimo WS upstream connect failed: %s", upstream_url)
        await websocket.accept()
        await websocket.close(code=1011)
        return

    selected_subprotocol = getattr(upstream, "subprotocol", None)
    await websocket.accept(subprotocol=selected_subprotocol)

    async def _client_to_upstream(tg: anyio.abc.TaskGroup) -> None:
        try:
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
        except Exception:
            logger.exception("Marimo WS client->upstream failed: %s", upstream_url)
        finally:
            try:
                await upstream.close()
            except Exception:
                pass
            tg.cancel_scope.cancel()

    async def _upstream_to_client(tg: anyio.abc.TaskGroup) -> None:
        try:
            async for message in upstream:
                if isinstance(message, str):
                    await websocket.send_text(message)
                else:
                    await websocket.send_bytes(message)
        except Exception:
            logger.exception("Marimo WS upstream->client failed: %s", upstream_url)
        finally:
            try:
                code = getattr(upstream, "close_code", None) or 1000
                reason = getattr(upstream, "close_reason", "") or ""
                await websocket.close(code=code, reason=reason)
            except Exception:
                pass
            tg.cancel_scope.cancel()

    try:
        async with upstream:
            async with anyio.create_task_group() as tg:
                tg.start_soon(_client_to_upstream, tg)
                tg.start_soon(_upstream_to_client, tg)
    finally:
        try:
            await upstream.close()
        except Exception:
            pass
