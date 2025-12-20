from app.services.marimo_proxy import MARIMO_SEMANTIC_ENTROPY_MOUNT, _rewrite_html


_SAMPLE_MARIMO_HTML = b"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <marimo-user-config data-config="{&quot;display&quot;:{&quot;theme&quot;:&quot;light&quot;}}"></marimo-user-config>
    <script data-marimo="true">
      window.__MARIMO_MOUNT_CONFIG__ = {
        "config": {"display": {"theme": "light"}},
      };
    </script>
    <a href="/assets/app.js">asset</a>
    <img src="/marimo/semantic-entropy-probe-comparison/assets/already.png" />
  </body>
</html>
"""


def test_rewrite_html_overrides_marimo_theme_when_theme_cookie_present():
    out = _rewrite_html(_SAMPLE_MARIMO_HTML, mount=MARIMO_SEMANTIC_ENTROPY_MOUNT, theme="dark").decode()
    assert '<base href="/marimo/semantic-entropy-probe-comparison/" />' in out
    assert 'href="/marimo/semantic-entropy-probe-comparison/assets/app.js"' in out
    assert 'src="/marimo/semantic-entropy-probe-comparison/assets/already.png"' in out
    assert '"theme": "dark"' in out
    assert "&quot;theme&quot;:&quot;dark&quot;" in out


def test_rewrite_html_leaves_marimo_theme_alone_without_theme_override():
    out = _rewrite_html(_SAMPLE_MARIMO_HTML, mount=MARIMO_SEMANTIC_ENTROPY_MOUNT).decode()
    assert '"theme": "light"' in out
    assert "&quot;theme&quot;:&quot;light&quot;" in out
