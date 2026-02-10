from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _strip_trailing_slash(value: str) -> str:
    if value.endswith("/"):
        return value[:-1]
    return value


@dataclass(frozen=True)
class SiteConfig:
    base_url: str
    site_title: str
    site_description: str
    author_name: str
    author_role: str
    default_og_image: str
    github_url: str | None
    linkedin_url: str | None
    x_url: str | None

    def canonical_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        normalized = path if path.startswith("/") else f"/{path}"
        return f"{self.base_url}{normalized}"


@lru_cache(maxsize=1)
def get_site_config() -> SiteConfig:
    base_url = _strip_trailing_slash(os.getenv("BASE_URL", "https://gunayintheory.com").strip())
    return SiteConfig(
        base_url=base_url,
        site_title=os.getenv("SITE_TITLE", "Gunay Soni"),
        site_description=os.getenv(
            "SITE_DESCRIPTION",
            "Research notes, experiments, and writing by Gunay Soni.",
        ),
        author_name=os.getenv("AUTHOR_NAME", "Gunay Soni"),
        author_role=os.getenv("AUTHOR_ROLE", "ML Researcher and Engineer"),
        default_og_image=os.getenv("DEFAULT_OG_IMAGE", "/static/about-portrait.png"),
        github_url=os.getenv("GITHUB_URL", "https://github.com/LiquidGunay"),
        linkedin_url=os.getenv("LINKEDIN_URL", None),
        x_url=os.getenv("X_URL", None),
    )
