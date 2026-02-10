---
name: marimo-notebook-testing
description: Validate marimo notebooks for correctness, WASM export behavior, and visualization performance, including Altair/Vega/VegaFusion feasibility checks. Use when editing notebook UI cells, data pipelines, chart specs, or export/deploy settings.
---

# Marimo Notebook Testing

## Scope

Use this skill for notebooks in `/home/ubuntu/semantic-entropy-probe-comparison`.

Primary targets:
- `notebooks/probe_analysis.py`
- `notebooks/probe_analysis_wasm.py`
- `scripts/07_build_analysis_dataset.py`

## Baseline Validation Workflow

1. Sync environment.

    uv sync --locked

2. Rebuild analysis data if pipeline/data code changed.

    python scripts/07_build_analysis_dataset.py

3. Run notebook server mode.

    uv run marimo run notebooks/probe_analysis.py --host 127.0.0.1 --port 7860

4. Validate notebook interactions:
- filters update datasets correctly
- chart selection works
- detail tables only render selected rows
- metrics panel loads expected values

## WASM Export Validation

1. Export with marimo:

    marimo export html-wasm notebooks/probe_analysis_wasm.py -o artifacts/wasm-test --mode run

2. Serve exported files over HTTP (not file://):

    cd artifacts/wasm-test
    python -m http.server 8765

3. Verify:
- page loads without broken assets
- data under `public/` is accessible
- chart rendering and selection still work
- no missing MIME behavior for wasm assets

## Performance Checklist

Use these rules before tuning chart syntax:

1. Keep chart payloads slim:
- exclude long text columns from chart dataframes
- separate chart dataset from detail dataset

2. Enforce deterministic caps:
- apply fixed random seed for sampling
- cap plotted rows explicitly

3. Keep interactivity bounded:
- limit selection-driven detail rows
- avoid rendering unbounded tables/cards

4. Prefer upstream reduction over client-only transforms.

## VegaFusion Feasibility Check

Run in server mode if dependency is available.

    uv run python - <<'PY'
    import altair as alt
    try:
        alt.data_transformers.enable("vegafusion")
        print("vegafusion-enabled")
    except Exception as exc:
        print(f"vegafusion-unavailable: {exc}")
    PY

If VegaFusion is unavailable or incompatible with target runtime, keep explicit dataframe reduction and Vega-Lite sampling as fallback.

## marimo + pytest Notes

- Keep test cells focused and deterministic.
- Avoid shared mutable state across cells.
- Use stable cell naming conventions to reduce merge/test noise.

## Completion Checklist

- notebook server run works end-to-end
- WASM export serves and behaves correctly over HTTP
- benchmark/performance checks show no regressions
- chart/detail payload separation is maintained
