import fs from "node:fs";
import path from "node:path";
import { CourseworkAssets } from "@/components/CourseworkAssets";
import { loadPage } from "@/lib/content";

const COURSEWORK_ASSET_VERSION = "20260621-3";

interface CourseNode {
  id?: string;
  code?: string;
  name: string;
  year?: string | number;
  semester?: number;
  credits?: number;
  description?: string;
  children?: CourseNode[];
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  subject: string;
  track: string;
  year: string;
  credits?: number;
  description?: string;
}

function courseDataPath() {
  return path.join(process.cwd(), "..", "app", "static", "courses.json");
}

function inferYear(code: string) {
  const match = code.match(/(\d{3})/);
  if (!match) return "Unsorted";
  return `Year ${Math.floor(Number.parseInt(match[1], 10) / 100)}`;
}

function formatYear(value: CourseNode["year"], code: string) {
  if (value === undefined || value === null || value === "") return inferYear(code);
  if (typeof value === "number") return `Year ${value}`;
  const trimmed = value.trim();
  if (!trimmed) return inferYear(code);
  if (/^\d+$/.test(trimmed) && Number.parseInt(trimmed, 10) <= 12) return `Year ${trimmed}`;
  return trimmed;
}

function flattenCourses() {
  const raw = fs.readFileSync(courseDataPath(), "utf8");
  const parsed = JSON.parse(raw) as { hierarchy?: CourseNode };
  const root = parsed.hierarchy;
  const courses: CourseItem[] = [];

  root?.children?.forEach((subject) => {
    subject.children?.forEach((track) => {
      track.children?.forEach((course) => {
        const code = course.code || course.id || course.name;
        courses.push({
          id: course.id || code,
          code,
          name: course.name,
          subject: subject.name,
          track: track.name,
          year: formatYear(course.year, code),
          credits: typeof course.credits === "number" ? course.credits : undefined,
          description: course.description,
        });
      });
    });
  });

  return courses;
}

function groupedByYear(courses: CourseItem[]) {
  const groups = new Map<string, CourseItem[]>();
  courses.forEach((course) => {
    const existing = groups.get(course.year) ?? [];
    existing.push(course);
    groups.set(course.year, existing);
  });

  return Array.from(groups.entries()).sort(([a], [b]) => {
    const aNum = Number.parseInt(a.replace(/\D+/g, ""), 10);
    const bNum = Number.parseInt(b.replace(/\D+/g, ""), 10);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^TODO\b/i.test(trimmed)) return null;
  return trimmed;
}

export default function CourseworkPage() {
  const courses = flattenCourses();
  const yearGroups = groupedByYear(courses);
  const subjectCount = new Set(courses.map((course) => course.subject)).size;
  const home = loadPage("home");
  const intro = optionalString(home?.meta.coursework_intro);

  return (
    <section className="coursework-shell">
      <header className="coursework-hero">
        <div>
          <h1>Coursework</h1>
          {intro ? <p>{intro}</p> : null}
        </div>
        <dl className="coursework-summary" aria-label="Coursework summary">
          <div>
            <dt>Courses</dt>
            <dd>{courses.length}</dd>
          </div>
          <div>
            <dt>Subjects</dt>
            <dd>{subjectCount}</dd>
          </div>
          <div>
            <dt>View</dt>
            <dd>Treemap</dd>
          </div>
        </dl>
      </header>

      <div id="cw-viz" className="cw">
        <div className="cw-layout">
          <figure className="cw-figure">
            <figcaption className="cw-caption">
              <div className="cw-caption-text">
                <h2>Course map</h2>
              </div>
              <div className="cw-legend" data-cw-legend aria-label="Subject legend" />
            </figcaption>
            <div className="viz-canvas" data-viz="treemap" aria-label="Coursework treemap" />
            <div className="cw-toolbar" aria-label="Coursework controls">
              <label className="cw-search" htmlFor="cw-search-input">
                <span>Find a course</span>
                <input
                  id="cw-search-input"
                  type="search"
                  data-cw-search
                  placeholder="Search by code, title, or topic"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="cw-year-chips" data-cw-years aria-label="Semester filters" />
              <p className="cw-stats" data-cw-stats>
                Loading...
              </p>
            </div>
          </figure>

          <aside className="cw-details" aria-label="Course details">
            <div className="cw-details-card">
              <div className="cw-details-header">
                <p className="eyebrow">Selected course</p>
                <button type="button" className="cw-details-clear" data-cw-clear hidden>
                  Clear
                </button>
              </div>
              <div className="cw-details-body" data-cw-details>
                <p className="cw-details-empty">Select a tile.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section className="course-index" aria-labelledby="course-index-title">
        <div className="section-heading">
          <p className="eyebrow">Chronology</p>
          <h2 id="course-index-title">Course index</h2>
        </div>
        <div className="course-year-list">
          {yearGroups.map(([year, items]) => (
            <section className="course-year" key={year}>
              <h3>{year}</h3>
              <ul>
                {items.map((course) => (
                  <li key={course.id}>
                    <span>{course.code}</span>
                    <strong>{course.name}</strong>
                    <em>{course.subject}</em>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <noscript>
        <p>
          <strong>Note:</strong> The treemap requires JavaScript. The course index above remains available without it.
        </p>
      </noscript>

      <link rel="stylesheet" href={`/static/coursework.css?v=${COURSEWORK_ASSET_VERSION}`} />
      <CourseworkAssets version={COURSEWORK_ASSET_VERSION} />
    </section>
  );
}
