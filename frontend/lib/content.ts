import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlockKind = "prose" | "python" | "output" | "chart";

export interface ProseBlock {
  id: string;
  kind: "prose";
  markdown: string;
}

export interface CodeBlock {
  id: string;
  kind: "python";
  source: string;
}

export interface OutputBlock {
  id: string;
  kind: "output";
  output: string;
}

export interface ChartBlock {
  id: string;
  kind: "chart";
  raw: string;
  spec: Record<string, unknown>;
}

export type MarkdownBlock = ProseBlock | CodeBlock | OutputBlock | ChartBlock;

export interface PostRecord {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  tags: string[];
  status: string;
  hero?: string;
  series?: string;
  canonicalPath?: string | null;
  content: string;
  blocks: MarkdownBlock[];
}

export interface StaticPage {
  slug: string;
  title: string;
  content: string;
  meta: Record<string, unknown>;
}

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const POSTS_DIR = path.join(PROJECT_ROOT, "content", "posts");
const PAGES_DIR = path.join(PROJECT_ROOT, "content", "pages");

const FENCE_RE = /```(python|output|chart)\n([\s\S]*?)\n```/g;

function normalizeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }
  return parsed.toISOString();
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeStatus(value: unknown): string {
  if (typeof value === "string") {
    const cleaned = value.trim().toLowerCase();
    if (cleaned) return cleaned;
  }
  return "published";
}

function readMarkdownFile(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

export function parsePostSource(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = FENCE_RE.exec(source)) !== null) {
    const index = match.index;
    const full = match[0];
    const kind = match[1] as MarkdownBlock["kind"] | undefined;
    const body = (match[2] ?? "").trim();

    const text = source.slice(cursor, index).trim();
    if (text) {
      blocks.push({ id: `prose-${idx++}`, kind: "prose", markdown: text });
    }

    if (kind === "python") {
      blocks.push({ id: `python-${idx++}`, kind: "python", source: body });
    } else if (kind === "output") {
      blocks.push({ id: `output-${idx++}`, kind: "output", output: body });
    } else if (kind === "chart") {
      let spec: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(body);
        spec =
          typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
      } catch {
        spec = {};
      }
      blocks.push({ id: `chart-${idx++}`, kind: "chart", spec, raw: body });
    }

    cursor = index + full.length;
  }

  const tail = source.slice(cursor).trim();
  if (tail) {
    blocks.push({ id: `prose-${idx++}`, kind: "prose", markdown: tail });
  }

  if (!blocks.length) {
    blocks.push({ id: "prose-empty", kind: "prose", markdown: source.trim() });
  }

  return blocks;
}

function normalizePostFrontmatter(filePath: string): PostRecord {
  const raw = readMarkdownFile(filePath);
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const slug = asString(fm.slug) ?? path.basename(path.dirname(filePath));
  const title = asString(fm.title) ?? slug;
  const date = asString(fm.date) ?? new Date(0).toISOString();
  const summary = asString(fm.summary);
  const tags = asStringArray(fm.tags);
  const status = normalizeStatus(fm.status);
  const hero = asString(fm.hero);
  const series = asString(fm.series);
  const canonicalPath = asString(fm.canonical_path);

  return {
    slug,
    title,
    date: normalizeDate(date),
    summary,
    tags,
    status,
    hero,
    series,
    canonicalPath,
    content: parsed.content,
    blocks: parsePostSource(parsed.content),
  };
}

export function loadAllPosts(): PostRecord[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const dirs = fs
    .readdirSync(POSTS_DIR)
    .filter((name) => fs.existsSync(path.join(POSTS_DIR, name, "index.md")));

  return dirs
    .map((name) => normalizePostFrontmatter(path.join(POSTS_DIR, name, "index.md")))
    .filter((post) => post.status.toLowerCase() !== "draft")
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function loadPostBySlug(slug: string): PostRecord | null {
  const file = path.join(POSTS_DIR, slug, "index.md");
  if (!fs.existsSync(file)) {
    return null;
  }
  const post = normalizePostFrontmatter(file);
  if (post.status.toLowerCase() === "draft") {
    return null;
  }
  return post;
}

export function loadPostBySlugIncludingDrafts(slug: string): PostRecord | null {
  const file = path.join(POSTS_DIR, slug, "index.md");
  if (!fs.existsSync(file)) {
    return null;
  }
  return normalizePostFrontmatter(file);
}

export function loadPage(slug: string): StaticPage | null {
  const file = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) {
    return null;
  }
  const source = readMarkdownFile(file);
  const parsed = matter(source);
  const fm = parsed.data as Record<string, unknown>;
  return {
    slug,
    title: asString(fm.title) ?? slug,
    content: parsed.content,
    meta: fm,
  };
}
