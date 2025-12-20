from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[1]
COURSEWORK_PATH = REPO_ROOT / "app" / "static" / "courses.json"

app = FastAPI(title="Coursework Editor", docs_url="/docs")


def _read_coursework() -> dict[str, Any]:
    try:
        return json.loads(COURSEWORK_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Missing data file: {COURSEWORK_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="courses.json is not valid JSON") from exc


def _write_coursework(data: dict[str, Any]) -> None:
    COURSEWORK_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = COURSEWORK_PATH.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp_path.replace(COURSEWORK_PATH)


def _iter_subject_nodes(hierarchy: dict[str, Any]) -> list[dict[str, Any]]:
    children = hierarchy.get("children")
    if not isinstance(children, list):
        return []
    return [c for c in children if isinstance(c, dict)]


def _get_or_create_subject(hierarchy: dict[str, Any], subject: str) -> dict[str, Any]:
    for node in _iter_subject_nodes(hierarchy):
        if node.get("name") == subject:
            node.setdefault("children", [])
            return node
    node = {"name": subject, "children": []}
    hierarchy.setdefault("children", []).append(node)
    return node


def _iter_group_nodes(subject_node: dict[str, Any]) -> list[dict[str, Any]]:
    children = subject_node.get("children")
    if not isinstance(children, list):
        return []
    return [c for c in children if isinstance(c, dict)]


def _get_or_create_group(subject_node: dict[str, Any], group: str) -> dict[str, Any]:
    for node in _iter_group_nodes(subject_node):
        if node.get("name") == group:
            node.setdefault("children", [])
            return node
    node = {"name": group, "children": []}
    subject_node.setdefault("children", []).append(node)
    return node


def _remove_course_by_id(hierarchy: dict[str, Any], course_id: str) -> None:
    for subject in _iter_subject_nodes(hierarchy):
        for group in _iter_group_nodes(subject):
            courses = group.get("children")
            if not isinstance(courses, list):
                continue
            remaining: list[Any] = []
            for course in courses:
                if not isinstance(course, dict):
                    remaining.append(course)
                    continue
                cid = str(course.get("id") or course.get("code") or course.get("name") or "")
                if cid != course_id:
                    remaining.append(course)
            group["children"] = remaining


def _flatten_courses(hierarchy: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for subject in _iter_subject_nodes(hierarchy):
        subject_name = str(subject.get("name") or "")
        for group in _iter_group_nodes(subject):
            group_name = str(group.get("name") or "")
            courses = group.get("children")
            if not isinstance(courses, list):
                continue
            for course in courses:
                if not isinstance(course, dict):
                    continue
                course_id = str(course.get("id") or course.get("code") or course.get("name") or "")
                out.append(
                    {
                        "id": course_id,
                        "code": course.get("code"),
                        "name": course.get("name"),
                        "year": course.get("year"),
                        "description": course.get("description"),
                        "subject": subject_name,
                        "group": group_name,
                    }
                )
    return sorted(out, key=lambda c: (c["subject"], c["group"], str(c.get("code") or ""), str(c.get("name") or "")))


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "course"


class CoursePayload(BaseModel):
    subject: str = Field(min_length=1)
    group: str = Field(min_length=1)
    id: str | None = None
    code: str | None = None
    name: str = Field(min_length=1)
    year: int | str | None = None
    description: str | None = None


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Coursework Editor</title>
    <style>
      :root {{
        color-scheme: light dark;
        --bg: #0d1117;
        --fg: #e6edf3;
        --muted: rgba(230, 237, 243, 0.72);
        --card: rgba(30, 41, 59, 0.55);
        --border: rgba(148, 163, 184, 0.22);
        --accent: #60a5fa;
      }}
      @media (prefers-color-scheme: light) {{
        :root {{
          --bg: #ffffff;
          --fg: #0f172a;
          --muted: rgba(15, 23, 42, 0.72);
          --card: rgba(241, 245, 249, 0.85);
          --border: rgba(15, 23, 42, 0.12);
          --accent: #3b82f6;
        }}
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
        background: var(--bg);
        color: var(--fg);
      }}
      header {{
        padding: 1.5rem 1.25rem 1rem;
        border-bottom: 1px solid var(--border);
      }}
      header h1 {{
        margin: 0;
        font-size: 1.35rem;
        letter-spacing: 0.02em;
      }}
      header p {{
        margin: 0.4rem 0 0;
        color: var(--muted);
        max-width: 70ch;
        line-height: 1.5;
      }}
      main {{
        padding: 1.25rem;
        max-width: 1200px;
        margin: 0 auto;
      }}
      .grid {{
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
        gap: 1.25rem;
        align-items: start;
      }}
      @media (max-width: 980px) {{
        .grid {{ grid-template-columns: 1fr; }}
      }}
      .card {{
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 1rem;
        padding: 1rem;
        box-shadow: 0 14px 40px rgba(2, 6, 23, 0.25);
      }}
      .card h2 {{
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }}
      label {{
        display: block;
        font-size: 0.85rem;
        letter-spacing: 0.02em;
        margin: 0.75rem 0 0.35rem;
        color: var(--muted);
      }}
      input, textarea {{
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid var(--border);
        background: rgba(15, 23, 42, 0.18);
        color: inherit;
        padding: 0.65rem 0.75rem;
        font-size: 0.95rem;
      }}
      @media (prefers-color-scheme: light) {{
        input, textarea {{ background: rgba(255,255,255,0.7); }}
      }}
      textarea {{ min-height: 120px; resize: vertical; }}
      .row {{
        display: flex;
        gap: 0.75rem;
      }}
      .row > div {{ flex: 1; }}
      .actions {{
        display: flex;
        gap: 0.6rem;
        margin-top: 1rem;
        flex-wrap: wrap;
      }}
      button {{
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(15, 23, 42, 0.25);
        color: inherit;
        padding: 0.55rem 0.9rem;
        cursor: pointer;
        font-weight: 600;
      }}
      button.primary {{
        border-color: rgba(96, 165, 250, 0.55);
        background: rgba(96, 165, 250, 0.18);
      }}
      button.danger {{
        border-color: rgba(248, 113, 113, 0.55);
        background: rgba(248, 113, 113, 0.14);
      }}
      button:disabled {{
        opacity: 0.55;
        cursor: not-allowed;
      }}
      table {{
        width: 100%;
        border-collapse: collapse;
      }}
      th, td {{
        border-bottom: 1px solid var(--border);
        padding: 0.5rem 0.35rem;
        text-align: left;
        vertical-align: top;
        font-size: 0.9rem;
      }}
      th {{
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }}
      .mono {{
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.86em;
      }}
      .pill {{
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.75rem;
      }}
      .muted {{ color: var(--muted); }}
      a {{ color: var(--accent); text-decoration: none; }}
      a:hover {{ text-decoration: underline; }}
      .toolbar {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }}
    </style>
  </head>
  <body>
    <header>
      <h1>Coursework editor</h1>
      <p>
        Edits <span class="mono">{COURSEWORK_PATH}</span>. This tool is meant to run locally on
        <span class="mono">127.0.0.1</span> and is separate from the personal site.
      </p>
      <p class="muted">
        Tip: keep the site running on <span class="mono">http://127.0.0.1:8000/coursework</span> to preview changes.
      </p>
    </header>

    <main>
      <div class="grid">
        <section class="card">
          <div class="toolbar">
            <h2>Add / edit course</h2>
            <span id="status" class="pill">Ready</span>
          </div>

          <input type="hidden" id="course-id" />

          <label for="subject">Subject</label>
          <input id="subject" list="subjects" placeholder="e.g. Computer Science" />
          <datalist id="subjects"></datalist>

          <label for="group">Group</label>
          <input id="group" list="groups" placeholder="e.g. Foundations & Systems" />
          <datalist id="groups"></datalist>

          <div class="row">
            <div>
              <label for="code">Code</label>
              <input id="code" placeholder="e.g. CS 110" />
            </div>
            <div>
              <label for="year">Year</label>
              <input id="year" placeholder="e.g. 1" />
            </div>
          </div>

          <label for="name">Name</label>
          <input id="name" placeholder="e.g. Computing Lab" />

          <label for="description">Description</label>
          <textarea id="description" placeholder="(optional; fill in later)"></textarea>

          <div class="actions">
            <button id="save" class="primary">Save</button>
            <button id="new">New</button>
            <button id="delete" class="danger" disabled>Delete</button>
          </div>

          <p class="muted" style="margin: 1rem 0 0; line-height: 1.5;">
            Creating a new subject/group is as simple as typing a new value. IDs default to the code (or a slug of the
            name if code is empty).
          </p>
        </section>

        <section class="card">
          <div class="toolbar">
            <h2>Courses</h2>
            <a href="/docs" target="_blank" rel="noreferrer">API docs</a>
          </div>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Subject</th>
                <th>Group</th>
                <th>Year</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="courses"></tbody>
          </table>
        </section>
      </div>
    </main>

    <script>
      const statusEl = document.getElementById('status');
      const subjectsEl = document.getElementById('subjects');
      const groupsEl = document.getElementById('groups');
      const coursesEl = document.getElementById('courses');

      const fields = {{
        id: document.getElementById('course-id'),
        subject: document.getElementById('subject'),
        group: document.getElementById('group'),
        code: document.getElementById('code'),
        year: document.getElementById('year'),
        name: document.getElementById('name'),
        description: document.getElementById('description'),
      }};

      const saveBtn = document.getElementById('save');
      const newBtn = document.getElementById('new');
      const deleteBtn = document.getElementById('delete');

      let state = {{ subjects: [], courses: [] }};

      function setStatus(text) {{
        statusEl.textContent = text;
      }}

      function clearForm() {{
        fields.id.value = '';
        fields.subject.value = '';
        fields.group.value = '';
        fields.code.value = '';
        fields.year.value = '';
        fields.name.value = '';
        fields.description.value = '';
        deleteBtn.disabled = true;
        setStatus('Ready');
      }}

      function option(value) {{
        const opt = document.createElement('option');
        opt.value = value;
        return opt;
      }}

      function refreshDatalists() {{
        subjectsEl.innerHTML = '';
        for (const subj of state.subjects) {{
          subjectsEl.appendChild(option(subj.name));
        }}
        refreshGroupDatalist();
      }}

      function refreshGroupDatalist() {{
        const selectedSubject = (fields.subject.value || '').trim();
        const subj = state.subjects.find((s) => s.name === selectedSubject);
        groupsEl.innerHTML = '';
        if (!subj) return;
        for (const group of subj.groups) {{
          groupsEl.appendChild(option(group));
        }}
      }}

      function courseLabel(course) {{
        const code = course.code ? `${{course.code}} · ` : '';
        return `${{code}}${{course.name || course.id}}`;
      }}

      function renderCourses() {{
        coursesEl.innerHTML = '';
        for (const course of state.courses) {{
          const tr = document.createElement('tr');
          const tdCourse = document.createElement('td');
          const tdSubject = document.createElement('td');
          const tdGroup = document.createElement('td');
          const tdYear = document.createElement('td');
          const tdActions = document.createElement('td');

          tdCourse.innerHTML = `<div><span class="mono">${{course.id}}</span></div><div>${{courseLabel(course)}}</div>`;
          tdSubject.textContent = course.subject || '';
          tdGroup.textContent = course.group || '';
          tdYear.textContent = course.year == null ? '' : String(course.year);

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', () => {{
            fields.id.value = course.id || '';
            fields.subject.value = course.subject || '';
            fields.group.value = course.group || '';
            fields.code.value = course.code || '';
            fields.year.value = course.year == null ? '' : String(course.year);
            fields.name.value = course.name || '';
            fields.description.value = course.description || '';
            deleteBtn.disabled = !course.id;
            refreshGroupDatalist();
            setStatus('Editing');
          }});

          tdActions.appendChild(editBtn);

          tr.appendChild(tdCourse);
          tr.appendChild(tdSubject);
          tr.appendChild(tdGroup);
          tr.appendChild(tdYear);
          tr.appendChild(tdActions);
          coursesEl.appendChild(tr);
        }}
      }}

      async function loadState() {{
        const resp = await fetch('/api/state');
        if (!resp.ok) throw new Error('Failed to load state');
        state = await resp.json();
        refreshDatalists();
        renderCourses();
      }}

      function buildPayload() {{
        const payload = {{
          subject: (fields.subject.value || '').trim(),
          group: (fields.group.value || '').trim(),
          id: (fields.id.value || '').trim() || null,
          code: (fields.code.value || '').trim() || null,
          name: (fields.name.value || '').trim(),
          year: (fields.year.value || '').trim() || null,
          description: (fields.description.value || '').trim() || null,
        }};
        if (payload.year && /^\\d+$/.test(payload.year)) {{
          payload.year = Number(payload.year);
        }}
        return payload;
      }}

      async function saveCourse() {{
        const payload = buildPayload();
        if (!payload.subject || !payload.group || !payload.name) {{
          setStatus('Subject, group, and name are required');
          return;
        }}
        setStatus('Saving…');
        const resp = await fetch('/api/course', {{
          method: 'POST',
          headers: {{ 'content-type': 'application/json' }},
          body: JSON.stringify(payload),
        }});
        if (!resp.ok) {{
          const msg = await resp.text();
          setStatus(`Error: ${{msg}}`);
          return;
        }}
        await loadState();
        setStatus('Saved');
        if (!fields.id.value) {{
          clearForm();
        }}
      }}

      async function deleteCourse() {{
        const id = (fields.id.value || '').trim();
        if (!id) return;
        if (!confirm(`Delete ${{id}}?`)) return;
        setStatus('Deleting…');
        const resp = await fetch(`/api/course/${{encodeURIComponent(id)}}`, {{ method: 'DELETE' }});
        if (!resp.ok) {{
          const msg = await resp.text();
          setStatus(`Error: ${{msg}}`);
          return;
        }}
        await loadState();
        clearForm();
        setStatus('Deleted');
      }}

      saveBtn.addEventListener('click', saveCourse);
      newBtn.addEventListener('click', clearForm);
      deleteBtn.addEventListener('click', deleteCourse);
      fields.subject.addEventListener('change', refreshGroupDatalist);

      loadState().catch((err) => {{
        console.error(err);
        setStatus('Failed to load');
      }});
    </script>
  </body>
</html>
""",
    )


@app.get("/api/state")
def api_state() -> JSONResponse:
    data = _read_coursework()
    hierarchy = data.get("hierarchy")
    if not isinstance(hierarchy, dict):
        raise HTTPException(status_code=500, detail="courses.json missing hierarchy")

    subjects: list[dict[str, Any]] = []
    for subject in _iter_subject_nodes(hierarchy):
        name = subject.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        groups = [g.get("name") for g in _iter_group_nodes(subject) if isinstance(g.get("name"), str)]
        subjects.append({"name": name, "groups": sorted([g for g in groups if g])})

    return JSONResponse({"subjects": sorted(subjects, key=lambda s: s["name"]), "courses": _flatten_courses(hierarchy)})


@app.post("/api/course")
def upsert_course(payload: CoursePayload) -> dict[str, str]:
    data = _read_coursework()
    hierarchy = data.get("hierarchy")
    if not isinstance(hierarchy, dict):
        raise HTTPException(status_code=500, detail="courses.json missing hierarchy")

    subject = payload.subject.strip()
    group = payload.group.strip()

    code = (payload.code or "").strip() or None
    name = payload.name.strip()

    course_id = (payload.id or "").strip() or None
    if course_id is None:
        course_id = code or _slug(name)
    if not course_id:
        raise HTTPException(status_code=400, detail="Unable to derive course id")

    _remove_course_by_id(hierarchy, course_id)

    subject_node = _get_or_create_subject(hierarchy, subject)
    group_node = _get_or_create_group(subject_node, group)

    course: dict[str, Any] = {"id": course_id, "code": code, "name": name}

    if payload.year is not None and payload.year != "":
        course["year"] = payload.year
    if payload.description is not None and payload.description.strip():
        course["description"] = payload.description.strip()
    else:
        course.pop("description", None)

    group_node.setdefault("children", []).append(course)
    _write_coursework(data)
    return {"status": "ok", "id": course_id}


@app.delete("/api/course/{course_id}")
def delete_course(course_id: str) -> dict[str, str]:
    data = _read_coursework()
    hierarchy = data.get("hierarchy")
    if not isinstance(hierarchy, dict):
        raise HTTPException(status_code=500, detail="courses.json missing hierarchy")
    course_id = course_id.strip()
    if not course_id:
        raise HTTPException(status_code=400, detail="Missing id")

    before = len(_flatten_courses(hierarchy))
    _remove_course_by_id(hierarchy, course_id)
    after = len(_flatten_courses(hierarchy))
    _write_coursework(data)
    if before == after:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"status": "ok"}
