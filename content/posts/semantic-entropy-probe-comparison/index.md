---
title: Semantic Entropy Probe Comparison
date: 2025-12-18
slug: semantic-entropy-probe-comparison
summary: Comparative notes on semantic entropy probe outputs, captured as lightweight markdown cells.
status: published
tags: [marimo, notebook]
hero: /static/about-portrait.png
series: Research Notes
canonical_path: /blog/semantic-entropy-probe-comparison
seo_title: Semantic Entropy Probe Comparison
seo_description: A minimal notebook-like writeup using code and chart cells.
---

# Semantic Entropy Probe Comparison

The original interactive notebook embed is replaced with explicit, portable notebook-like blocks.

## Probe signal import

```python
from pathlib import Path
import json

# Example path used for local experimentation
payload = Path("./analysis.json")
print("Probe input ready", payload.exists())
```

```output
Probe input ready True
```

## Probe comparison snapshot

```chart
{
  "title": "Probe score by synthetic sample",
  "type": "bar",
  "xKey": "sample",
  "yKey": "score",
  "data": [
    {"sample": "Baseline", "score": 0.22},
    {"sample": "Probe A", "score": 0.47},
    {"sample": "Probe B", "score": 0.61},
    {"sample": "Probe C", "score": 0.54}
  ]
}
```

```output
Marimo notebook payload extraction:
- Source: Marimo/WASM export for heavy interactive sessions.
- Static post: code + chart block for fast, reproducible review.
```

For deeper interaction, keep the full notebook workflow as a static asset under `/static/marimo/...` and embed it only when explicitly enabled.
